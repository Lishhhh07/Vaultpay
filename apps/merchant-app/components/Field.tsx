"use client";

const inputCls =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";

export function Field({
  label, type = "text", value, onChange, placeholder, autoComplete, inputMode, maxLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
  maxLength?: number;
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
        maxLength={maxLength}
        className={inputCls}
      />
    </label>
  );
}

export function SelectField({
  label, value, onChange, options, placeholder = "Select...",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block mb-1 text-sm font-medium text-gray-900">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}