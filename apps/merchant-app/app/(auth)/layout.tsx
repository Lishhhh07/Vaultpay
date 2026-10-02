export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#ebe6e6] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border p-8">
        <h1 className="text-2xl font-bold text-[#6a51a6] mb-6">Paytm for Business</h1>
        {children}
      </div>
    </div>
  );
}