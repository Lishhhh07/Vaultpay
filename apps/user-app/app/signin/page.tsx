import { SigninForm } from "./SigninForm";

function safePath(p?: string) {
    if (!p || !p.startsWith("/") || p.startsWith("//") || p.includes("\\")) return "/dashboard";
    return p;
}

export default function Page({ searchParams }: { searchParams: { callbackUrl?: string } }) {
    return <SigninForm callbackUrl={safePath(searchParams.callbackUrl)} />;
}