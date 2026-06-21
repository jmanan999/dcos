"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /wards redirects to /transparency/wards (the public Ward Index)
export default function WardsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/transparency/wards"); }, [router]);
  return null;
}
