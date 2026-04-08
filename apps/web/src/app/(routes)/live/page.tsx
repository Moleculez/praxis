"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LivePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/trading");
  }, [router]);
  return null;
}
