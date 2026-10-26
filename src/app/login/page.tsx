"use client";

import { authclient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Login(){
  const [email, setEmail]= useState("");
  const [password, setPassword]= useState("");
  const [showPassword, setShowPassword]= useState(false);
  const router= useRouter();
  const [errorMessage, setErrorMessage]= useState("");
  const [loading, setLoading]= useState(false);
  const [isSignUp, setIsSignUp]= useState(false);
  const [name, setName]=useState("");
  const [confirmPassword, setConfirmPassword]= useState("");
  const [showConfirmPassword, setShowConfirmPassword]=useState(false);

  useEffect(()=>{
    authclient.getSession().then(({data, error})=>{
        console.log("CURRENT SESSION:", data);
        console.log("SESSION ERROR:", error);
    });
  },[]);


  async function login() {
    setErrorMessage("");

    if (!email.trim() || !password) {
        setErrorMessage("Email and password are required.");
        return;
    }

    setLoading(true);

    try {
        const { error } = await authclient.signIn.email({
            email: email.trim(),
            password,
        });

        if (error) {
            setErrorMessage(error.message || "Invalid email or password.");
            return;
        }

        router.push("/");
        router.refresh();
    } catch {
        setErrorMessage("Unable to log in. Please try again.");
    } finally {
        setLoading(false);
    }
}

    async function createAccount(){
        setErrorMessage("");
        if(!name || !email || !password || !confirmPassword){
            setErrorMessage("Please fill all fields.");
            return;
        }
        if(password !== confirmPassword){
            setErrorMessage("Password do not match.");
            return;
        }
        setLoading(true);
        try{
            const {data, error}= await authclient.signUp.email({
                name,
                email,
                password,
            });
            if(error){
                console.log("SIGNUP ERROR:", error);
                setErrorMessage(error.message || "Failed to create account.");
                return;
            }
            console.log("SIGNUP SUCCESS:", data);
            router.push("/");
        }catch(error){
            console.error("SIGNUP ERROR:", error);
            setErrorMessage("Something went wrong while creating the account.");
        }finally{
            setLoading(false);
        }
    }
    return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
        <div className="w-full max-w-md">
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white shadow-sm dark:bg-slate-100 dark:text-slate-900">
                    R
                </div>

                <h1 className="text-3xl font-bold tracking-tight">
                    Rentello
                </h1>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Your rentals. Under control.
                </p>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {isSignUp ? "Create your account" : "Welcome back"}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {isSignUp
                            ? "Enter your details to get started."
                            : "Log in to manage your properties and rentals."}
                    </p>
                </div>

                <form
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!loading) {
                            void (isSignUp ? createAccount() : login());
                        }
                    }}
                >
                    {isSignUp && (
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Full name
                            </label>

                            <input
                                id="name"
                                type="text"
                                autoComplete="name"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="email"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Email address
                        </label>

                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Password
                        </label>

                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete={isSignUp ? "new-password" : "current-password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                                required
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="absolute inset-y-0 right-3 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    {isSignUp && (
                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Confirm password
                            </label>

                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                                    required
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                    className="absolute inset-y-0 right-3 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                >
                                    {showConfirmPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:focus:ring-offset-slate-900"
                    >
                        {loading
                            ? (isSignUp ? "Creating account..." : "Logging in...")
                            : (isSignUp ? "Create account" : "Log in")}
                    </button>
                </form>

                <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">
                        {isSignUp
                            ? "Already have an account?"
                            : "Don't have an account?"}
                    </span>{" "}

                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp((current) => !current);
                            setErrorMessage("");
                        }}
                        className="font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-white"
                    >
                        {isSignUp ? "Log in" : "Sign up"}
                    </button>
                </div>
            </section>

            <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
                Securely manage your properties, tenants, and rental records.
            </p>
        </div>
    </main>
);
}