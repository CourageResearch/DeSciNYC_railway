"use client";

import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckIcon, Loader2, MailIcon, XIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email(),
});

type MailingListFormProps = {
  id?: string;
  className?: string;
  variant?: "hero" | "section";
  placeholder?: string;
  buttonLabel?: string;
  successMessage?: string;
};

const MailingListForm = ({
  id,
  className,
  variant = "section",
  placeholder = "Enter your email",
  buttonLabel = "Subscribe",
  successMessage = "Successfully subscribed to mailing list!",
}: MailingListFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setMessage(null);

      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: values.email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setMessage({
          text: data.error || "Could not subscribe that email.",
          type: "error",
        });
        return;
      }

      setMessage({
        text: successMessage,
        type: "success",
      });
      form.reset();
    } catch (error) {
      console.error("Error subscribing to mailing list:", error);
      setMessage({
        text: "An error occurred while subscribing",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isHero = variant === "hero";

  return (
    <div id={id} className={cn("w-full scroll-mt-8", isHero && "pt-1", className)}>
      <Form {...form}>
        <form
          className={cn(
            "relative z-20 flex w-full",
            isHero
              ? "flex-col gap-3 sm:flex-row sm:items-end sm:gap-3"
              : "flex-row items-start"
          )}
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className={cn("w-full", isHero && "space-y-2")}>
                {isHero && (
                  <FormLabel className="block text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[#86f086]/90 sm:text-[11px]">
                    Email for monthly NYC DeSci updates
                  </FormLabel>
                )}
                <div className="relative">
                  {isHero && (
                    <MailIcon
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86f086]/75"
                    />
                  )}
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      disabled={isLoading}
                      placeholder={placeholder}
                      aria-label="Email address"
                      className={cn(
                        "rounded-none text-stone-200",
                        isHero
                          ? "h-14 border-2 border-[#86f086]/80 bg-black/80 px-11 font-semibold placeholder:text-stone-500 shadow-[inset_0_0_0_1px_rgba(134,240,134,0.16)] focus-visible:border-[#c9ff8a] focus-visible:ring-2 focus-visible:ring-[#0fa711]/60"
                          : "h-10 border-[#0fa711]/40 bg-[#0d230d] placeholder:text-[#0fa711]/40"
                      )}
                      required
                    />
                  </FormControl>
                </div>
                <FormMessage className={cn(isHero && "text-[#ff8a8a]")} />
              </FormItem>
            )}
          />
          <Button
            variant="green"
            className={cn(
              "shrink-0 font-bold text-white",
              isHero ? "h-14 w-full tracking-[0.08em] sm:w-40" : "h-10 w-40"
            )}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : buttonLabel}
          </Button>
        </form>
      </Form>
      <div
        className={cn(
          "flex min-h-5 items-center justify-start gap-1 font-semibold",
          isHero ? "mt-2 text-xs" : "mt-3 text-sm",
          message?.type === "success" ? "text-green-400" : "text-red-400"
        )}
        aria-live="polite"
      >
        {message && (
          <>
            {message.type === "success" ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <XIcon className="h-4 w-4" />
            )}
            {message.text}
          </>
        )}
      </div>
    </div>
  );
};

export default MailingListForm;
