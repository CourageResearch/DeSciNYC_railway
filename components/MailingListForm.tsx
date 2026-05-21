"use client";

import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckIcon, Loader2, XIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Form, FormField, FormItem, FormMessage } from "./ui/form";
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
    <div id={id} className={cn("w-full scroll-mt-8", className)}>
      <Form {...form}>
        <form
          className={cn(
            "relative z-20 flex w-full",
            isHero
              ? "flex-col gap-2 sm:flex-row sm:gap-0"
              : "flex-row items-start"
          )}
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="w-full">
                <Input
                  {...field}
                  type="email"
                  disabled={isLoading}
                  placeholder={placeholder}
                  className={cn(
                    "rounded-none text-stone-200 placeholder:text-[#0fa711]/40",
                    isHero
                      ? "h-12 border-2 border-[#0fa711]/60 bg-black/45 px-4 font-semibold md:h-14 sm:border-r-0"
                      : "h-10 border-[#0fa711]/40 bg-[#0d230d]"
                  )}
                  required
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            variant="green"
            className={cn(
              "shrink-0 font-bold text-white",
              isHero ? "h-12 w-full md:h-14 sm:w-36" : "h-10 w-40"
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
