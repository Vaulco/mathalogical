import { Authenticated, Unauthenticated} from "convex/react";

export default function Share() {
  return (
    <div className="flex flex-row">
        <Authenticated>
        <div className="cursor-pointer text-[15px] px-2 flex items-center">Share</div>
        </Authenticated>
        <Unauthenticated>
          <img src="/avatar.png" alt="Default profile" width={33} height={33} className="object-cover" />
        </Unauthenticated></div>
  )
}