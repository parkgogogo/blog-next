import MarkdownRenderer from "@/components/MarkdownRenderer";
import { fetchTestContent } from "./service";

export default async function MarkdownTestPage() {
  let content = "";
  let error = "";

  try {
    content = await fetchTestContent();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load test content";
    console.error("Error loading test content:", err);
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Markdown Rendering Test</h1>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-red-800 font-semibold mb-2">
            Error Loading Content
          </h2>
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <MarkdownRenderer content={content} />
        </div>
      )}

      <div className="mt-8 text-sm text-gray-600">
        <p>
          This page demonstrates markdown rendering using an internal e2e
          fixture file.
        </p>
      </div>
    </div>
  );
}
