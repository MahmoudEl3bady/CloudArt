import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="auth">
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn> 
      {children}
    </main>
  );
}

export default Layout