"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

export function SigninForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const { data, error } = await authClient.signIn.email({
        /**
         * The user email
         */
        email,
        /**
         * The user password
         */
        password,
        /**
         * a url to redirect to after the user verifies their email (optional)
         */
        callbackURL: "/",
        /**
         * remember the user session after the browser is closed.
         * @default true
         */
        rememberMe,
    }, {
        onRequest: () => {
          setLoading(true)
        },
        onSuccess: () => {
          //redirect to the dashboard or sign in page
        },
        onError: (ctx) => {
          setLoading(false)
          setError(ctx.error.message || "Sign in failed")
        },
    })
  }

  const handleSocialLogin = async (provider: "google") => {
    setError(null)
    setLoading(true)

    await authClient.signIn.social({
      /**
       * The social provider ID
       * @example "google"
       */
      provider,
      /**
       * A URL to redirect after the user authenticates with the provider
       * @default "/"
       */
      callbackURL: "/", 
      /**
       * A URL to redirect if an error occurs during the sign in process
       */
      errorCallbackURL: "/error",
      /**
       * A URL to redirect if the user is newly registered
       */
      newUserCallbackURL: "/",
      /**
       * disable the automatic redirect to the provider. 
       * @default false
       */
      disableRedirect: false,
    }, {
      onRequest: () => {
        setLoading(true)
      },
      onSuccess: () => {
        //redirect to the dashboard or sign in page
      },
      onError: (ctx) => {
        setLoading(false)
        setError(ctx.error.message || "Sign in failed")
      },
    })
  }
  return (
    <form 
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Sign in to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to sign in to your account
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-500 text-center">{error}</div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox
						id="remember"
						onClick={() => {
							setRememberMe(!rememberMe);
						}}
					/>
          <FieldLabel htmlFor="remember">Remember me</FieldLabel>
        </Field>
        <Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button
            variant="outline"
            type="button"
            onClick={() => handleSocialLogin("google")}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Sign in with Google
          </Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a href="/sign-up" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
