// client/src/components/UploadsList.tsx
"use client";

import { useState, useEffect } from "react";
import { useUploads } from "../context/UploadContext";

interface Upload {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  publicId: string | null;
  resourceType: string | null;
  _count: {
    records: number;
    threats: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function UploadsList({ companyId }: { companyId: string }) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { completedUploads } = useUploads();

  const fetchUploads = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/audit/upload`, {
        headers: {
          Authorization: process.env.NEXT_PUBLIC_TOKEN!,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch uploads");
      }

      const data = await response.json();
      setUploads(data.uploads);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch uploads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads(currentPage);
  }, [currentPage, companyId]);

  useEffect(() => {
    if (completedUploads.size > 0) {
      fetchUploads(currentPage);
    }
  }, [completedUploads]);

  const handleDownload = async (uploadId: string, fileName: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/audit/download/${uploadId}`,
        {
          headers: {
            Authorization: process.env.NEXT_PUBLIC_TOKEN!,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleDelete = async (uploadId: string) => {
    if (
      !confirm("Are you sure you want to delete this upload? All associated data will be removed.")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/uploads/${uploadId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: process.env.NEXT_PUBLIC_TOKEN!,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      // Refresh the list
      fetchUploads(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-800 shadow">
        <h2 className="text-xl font-bold mb-4">Upload History</h2>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-gray-800 shadow">
        <h2 className="text-xl font-bold mb-4">Upload History</h2>
        <div className="text-red-400 p-4 bg-red-900/20 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-800 shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Upload History</h2>
        <button
          onClick={() => fetchUploads(currentPage)}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {uploads.length === 0 ? (
        <div className="text-gray-400 p-4 text-center">No uploads found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2">File Name</th>
                  <th className="text-left p-2">Size</th>
                  <th className="text-left p-2">Records</th>
                  <th className="text-left p-2">Threats</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Uploaded</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-2">
                      <div className="font-medium">{upload.fileName}</div>
                      <div className="text-xs text-gray-400">{upload.fileType}</div>
                    </td>
                    <td className="p-2">{formatFileSize(upload.fileSize)}</td>
                    <td className="p-2">{upload._count.records.toLocaleString()}</td>
                    <td className="p-2">
                      <span
                        className={
                          upload._count.threats > 0 ? "text-red-400 font-medium" : "text-green-400"
                        }
                      >
                        {upload._count.threats}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          upload.status === "completed"
                            ? "bg-green-900/30 text-green-400"
                            : upload.status === "processing"
                            ? "bg-blue-900/30 text-blue-400"
                            : upload.status === "error"
                            ? "bg-red-900/30 text-red-400"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {upload.status}
                      </span>
                    </td>
                    <td className="p-2 text-xs text-gray-400">{formatDate(upload.createdAt)}</td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        {upload.publicId && (
                          <button
                            onClick={() => handleDownload(upload.id, upload.fileName)}
                            className="p-1 text-blue-400 hover:text-blue-300"
                            title="Download"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(upload.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => setCurrentPage(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="text-sm text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={() => setCurrentPage(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
