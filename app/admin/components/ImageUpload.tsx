"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";

type GalleryImage = {
  key: string;
  url: string;
  filename: string;
};

export default function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch images from bucket
  const fetchImages = async () => {
    try {
      const response = await fetch("/api/admin/gallery");
      if (!response.ok) {
        const data = await response.json();
        setMessage(data.error || "Failed to fetch images");
        return;
      }

      setImages(await response.json());
    } catch (error) {
      console.error("Error fetching images:", error);
      setMessage("Failed to fetch images");
      return;
    }
  };

  // Fetch images when component mounts
  useEffect(() => {
    fetchImages();
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      setMessage("No files dropped");
      return;
    }

    setUploading(true);
    setMessage("");

    await uploadFiles(files);
  };

  // Upload handler
  const handleUpload = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setMessage("No files selected");
      return;
    }
    setUploading(true);
    setMessage("");

    await uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete handler
  const handleDelete = async (key: string) => {
    try {
      const response = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        const data = await response.json();
        setMessage(data.error || "Failed to archive image");
        return;
      }

      setMessage("Successfully archived image");
      fetchImages(); // Refresh the image list after move
    } catch (error) {
      setMessage(`Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const uploadFiles = async (files: FileList) => {
    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          formData.append("files", file);
        }
      }

      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setMessage(data.error || "Upload failed");
        return;
      }

      setMessage("Upload successful!");
      fetchImages();
    } catch (error) {
      setMessage(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-8">
      <div
        className={`w-full max-w-md aspect-square mb-4 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-green-500 bg-green-50' 
            : uploading
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <div className="text-center p-6">
          {uploading ? (
            <p className="text-blue-600 mb-2">Uploading...</p>
          ) : (
            <>
              <p className="text-gray-600 mb-2">Drag and drop images here</p>
              <p className="text-sm text-gray-500">or click to select files</p>
            </>
          )}
        </div>
      </div>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleUpload}
      />
      {message && <div className="mt-4">{message}</div>}

      <h2 className="text-xl font-bold mb-4">Gallery Images</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={image.key} className="relative group">
            <div className="aspect-square relative overflow-hidden">
              <Image
                src={image.url}
                alt={image.filename || `Gallery image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <button
              onClick={() => handleDelete(image.key)}
              className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Archive
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 
