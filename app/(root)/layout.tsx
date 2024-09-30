import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ReactNode } from "react";

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="root">
      <div className="root-container">
        <div className="wrapper">
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          {children}
        </div>
      </div>
    </main>
  );
};

export default RootLayout;
