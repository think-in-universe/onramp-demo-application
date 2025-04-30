"use client";

import React from "react";

// Define types for the modal component
interface SimpleModalProps {
  title: string;
  content: React.ReactNode;
  canClose?: boolean;
  onClose: () => void;
  actions: React.ReactNode;
}

// Simple modal component
const SimpleModal: React.FC<SimpleModalProps> = ({
  title,
  content,
  canClose = true,
  onClose,
  actions,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {canClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
      <div className="mb-4">{content}</div>
      <div className="flex gap-2">{actions}</div>
    </div>
  </div>
);

export default SimpleModal;
