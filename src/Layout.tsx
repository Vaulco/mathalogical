import { ReactNode } from "react";

const fontFamily = "Katex_Main"

export function Layout({
  children,
}: {
  menu?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-[#f4f4f4] text-gray-700 w-full h-screen flex relative items-center justify-center">
      <div style={{ fontFamily: fontFamily }} className="relative w-full h-screen max-h-screen max-w-[770px] flex flex-col items-center justify-center px-3">
        {children}
      </div>   
    </div>
  );
}
