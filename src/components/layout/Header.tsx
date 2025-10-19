import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ConnectWallet from "@/components/wallet/ConnectWallet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [];

  const onNavItemClick = () => {
    setIsOpen(false);
  };

  return (
    <header
      className={`fixed top-0 font-telegraf left-0 right-0 z-50 px-0 md:px-6 py-4 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md shadow-sm border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="md:px-0 px-5 mx-auto font-telegraf">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <ConnectWallet />
            </div>
            <ThemeToggle />

            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="top"
                  className="h-[60vh] flex justify-center w-full pt-6"
                >
                  <SheetHeader>
                    <SheetTitle></SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 w-full max-w-xs flex flex-col ">
                    <div className="flex mt-8 px-4 flex-col gap-4">
                      <div className="text-sm text-">Connected wallet:</div>
                      <div className="flex justify-left w-full max-w-xs">
                        <ConnectWallet />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
