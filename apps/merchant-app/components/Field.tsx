"use client";

export function Field({
  label, type = "text", value, onChange, placeholder, autoComplete, inputMode,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
}) {
  return (
    <label className="block">
      <span className="block mb-1 text-sm font-medium text-gray-900">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
      />
    </label>
  );
}