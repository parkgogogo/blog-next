import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

const octokitErrorSchema = z
  .object({
    status: z.number(),
  })
  .passthrough();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;

    // Get environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const attachmentPath = process.env.ATTACHMENT_PATH || "attachment";

    // Validate required environment variables
    if (!githubToken || !githubOwner || !githubRepo) {
      return NextResponse.json(
        { error: "Missing required GitHub configuration" },
        { status: 500 }
      );
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: githubToken,
    });

    // Construct the file path
    const filePath = path.join("/");
    const fullPath = `${attachmentPath}/${filePath}`;

    try {
      // Fetch file from GitHub using Octokit
      const { data } = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: fullPath,
      });

      // GitHub API returns base64 encoded content for files
      if (Array.isArray(data) || data.type !== "file") {
        return NextResponse.json(
          { error: "Path does not point to a file" },
          { status: 400 }
        );
      }

      let fileContent: Buffer;

      // For large files, GitHub API doesn't return content in base64
      // Instead, we need to fetch from the download_url
      if (!data.content && data.download_url) {
        const downloadResponse = await fetch(data.download_url);
        if (!downloadResponse.ok) {
          throw new Error(
            `Failed to download file: ${downloadResponse.status}`
          );
        }
        const arrayBuffer = await downloadResponse.arrayBuffer();
        fileContent = Buffer.from(arrayBuffer);
      } else {
        // Decode base64 content for smaller files
        fileContent = Buffer.from(data.content, "base64");
      }

      // Determine content type based on file extension
      const getContentType = (filename: string): string => {
        const ext = filename.toLowerCase().split(".").pop();
        const mimeTypes: { [key: string]: string } = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          svg: "image/svg+xml",
          pdf: "application/pdf",
          txt: "text/plain",
          md: "text/markdown",
          json: "application/json",
          css: "text/css",
          js: "application/javascript",
          html: "text/html",
        };

        return mimeTypes[ext || ""] || "application/octet-stream";
      };

      const contentType = getContentType(data.name);

      // 对于 HTML 和 SVG 文件，强制作为附件下载而不是内联渲染
      // 防止同源脚本执行攻击
      const isDangerousInlineType =
        contentType === "text/html" || contentType === "image/svg+xml";
      const contentDisposition = isDangerousInlineType
        ? `attachment; filename="${data.name}"`
        : `inline; filename="${data.name}"`;

      // Return the file with appropriate headers
      return new NextResponse(new Uint8Array(fileContent), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600, s-maxage=31536000",
          "Content-Disposition": contentDisposition,
          "Content-Length": fileContent.length.toString(),
        },
      });
    } catch (octokitError: unknown) {
      // Handle Octokit-specific errors
      const parsedError = octokitErrorSchema.safeParse(octokitError);
      if (parsedError.success) {
        const error = parsedError.data;
        if (error.status === 404) {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }

        console.error("Error fetching file from GitHub:", octokitError);
        return NextResponse.json(
          { error: "Failed to fetch file from GitHub" },
          { status: error.status }
        );
      }

      console.error("Error fetching file from GitHub:", octokitError);
      return NextResponse.json(
        { error: "Failed to fetch file from GitHub" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error serving attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
