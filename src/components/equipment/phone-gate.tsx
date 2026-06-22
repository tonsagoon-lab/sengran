"use client";

import { useState } from "react";
import { PhoneVerifyModal } from "./phone-verify-modal";

interface PhoneGateProps {
  phoneVerified: boolean;
  children: React.ReactNode;
}

export function PhoneGate({ phoneVerified, children }: PhoneGateProps) {
  const [verified, setVerified] = useState(phoneVerified);

  if (!verified) {
    return (
      <PhoneVerifyModal
        open={true}
        onVerified={() => setVerified(true)}
      />
    );
  }

  return <>{children}</>;
}
