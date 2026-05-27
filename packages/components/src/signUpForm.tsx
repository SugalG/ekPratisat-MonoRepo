"use client";

import { useState, useEffect, useRef } from "react";
import { useCreateClientUser, useCreateUser } from "@repo/query-hook";
import { UserSingUpSchema } from "@repo/validators";
import { Button } from "@repo/ui/button";
import AnimateLoader from "@repo/ui/animateLoader";
import { User, Mail, Phone, Lock, Eye, EyeOff, ImageIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";


type ErrorType = {
    name?: string;
    contact?: string;
    email?: string;
    password?: string;
};

export default function SignupForm() {
    const [form, setForm] = useState<UserSingUpSchema>({
        name: "",
        contact: "",
        email: "",
        password: ""
    });
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<ErrorType>({});
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [step, setStep] = useState<number>(1);
    const queryClient = useQueryClient();

    const signupMutation = useCreateClientUser();

    // refs for each input
    const nameRef = useRef<HTMLInputElement>(null);
    const contactRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // focus on the first error when error state changes
    useEffect(() => {
        if (error.name && nameRef.current) {
            nameRef.current.focus();
        } else if (error.contact && contactRef.current) {
            contactRef.current.focus();
        } else if (error.email && emailRef.current) {
            emailRef.current.focus();
        } else if (error.password && passwordRef.current) {
            passwordRef.current.focus();
        }
    }, [error]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if(!form.name.trim()){
            setError({name: "Please input a valid name."})
            setStep(1);
            return;
        }else if(!form.contact.trim()){
            setError({contact: "Please input a valid contact."})
            setStep(1);
            return;
        }else if(!form.email.trim()){
            setError({email: "Please input a valid email."})
            setStep(1);
            return;
        }else if(!form.password.trim()){
            setError({password: "Password field cannot be empty."})
            setStep(1);
            return;
        }

        const formData = new FormData();
        formData.append("name", form.name.trim());
        formData.append("contact", form.contact.trim());
        formData.append("password", form.password.trim());
        formData.append("email", form.email.trim());
        if (profileImage) formData.append("profileImage", profileImage);

        signupMutation.mutate(formData, {
            onSuccess: (data) => {
                toast.success("Signup and Logged in Successfully!!!");
                queryClient.invalidateQueries({
                    queryKey:["user-info"]
                })
                router.replace("/");
            },
            onError: (error) => {
                setError(error.fieldErrors || {})
                setStep(1);
                toast.error(error.error || "Signup Failed!!!")
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Only image files are allowed")
            return;
        }

        setProfileImage(file);
        setPreviewUrl(URL.createObjectURL(file));

        e.target.value = "";

    }
    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[rgba(154,106,0,0.14)] bg-white/85 px-8 pt-6 pb-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] dark:border-[var(--ek-dark-border)] dark:bg-[var(--ek-dark-surface)] w-full"
        >
            {step === 1 && (
                <>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Welcome to{" "}
                            <span className="text-gold-700 dark:text-gold-400">
                                <Link href="/">EkPratisat</Link>
                            </span>
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            “Your trusted partner in building dreams through real estate.”
                        </p>
                    </div>

                    {/* Name */}
                    <label className="block mb-4">
                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <User size={18} /> Name
                        </span>
                        <input
                            ref={nameRef}
                            type="text"
                            name="name"
                            value={form.name}
                            max={10}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-xl border border-[rgba(154,106,0,0.16)] bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-gold-700/40 focus:ring-2 focus:ring-gold-500/25 dark:border-[var(--ek-dark-border)] dark:bg-[var(--ek-dark-elevated)] dark:text-gray-100"
                            required
                        />
                        {error.name && <FieldError message={error.name} />}
                    </label>

                    {/* Contact */}
                    <label className="block mb-4">
                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Phone size={18} /> Contact
                        </span>
                        <input
                            ref={contactRef}
                            type="text"
                            inputMode="numeric"
                            name="contact"
                            pattern="\d*"
                            value={form.contact}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setForm({ ...form, contact: value });
                            }}
                            className="mt-1 block w-full rounded-xl border border-[rgba(154,106,0,0.16)] bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-gold-700/40 focus:ring-2 focus:ring-gold-500/25 dark:border-[var(--ek-dark-border)] dark:bg-[var(--ek-dark-elevated)] dark:text-gray-100"
                            required
                        />
                        {error.contact && <FieldError message={error.contact} />}
                    </label>

                    {/* Email */}
                    <label className="block mb-4">
                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Mail size={18} /> Email
                        </span>
                        <input
                            ref={emailRef}
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-xl border border-[rgba(154,106,0,0.16)] bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-gold-700/40 focus:ring-2 focus:ring-gold-500/25 dark:border-[var(--ek-dark-border)] dark:bg-[var(--ek-dark-elevated)] dark:text-gray-100"
                            required
                        />
                        {error.email && <FieldError message={error.email} />}
                    </label>

                    {/* Password with toggle */}
                    <label className="block mb-4">
                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Lock size={18} /> Password
                        </span>
                        <div className="relative">
                            <input
                                ref={passwordRef}
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-xl border border-[rgba(154,106,0,0.16)] bg-white px-3 py-2 pr-10 text-gray-900 outline-none transition focus:border-gold-700/40 focus:ring-2 focus:ring-gold-500/25 dark:border-[var(--ek-dark-border)] dark:bg-[var(--ek-dark-elevated)] dark:text-gray-100"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {error.password && <FieldError message={error.password} />}
                    </label>
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>Next</Button>
                </>
            )}
            {step === 2 && (
                <>
                    <>
                        <h2 className="text-xl font-bold mb-4 text-center">Step 2: Add Profile Picture (optional)</h2>

                        <div className="relative w-32 h-32 mx-auto mb-6">
                            {/* Hidden input */}
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            {/* Clickable circle */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-full border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center cursor-pointer hover:border-gray-600"
                            >
                                {!previewUrl ? (
                                    <span className="text-gray-400 text-4xl">+</span>
                                ) : (
                                    <img
                                        src={previewUrl}
                                        alt="Profile Preview"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                )}
                            </div>

                            {/* Remove button */}
                            {previewUrl && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setProfileImage(null);
                                        setPreviewUrl(null);
                                    }}
                                    className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <div className="h-20"></div>
                        <div className="flex justify-between">
                            <Button type="button" onClick={() => setStep(1)} variant="outline">← Back</Button>
                            <Button type="submit" variant="default"  disabled={signupMutation.isPending}>
                                {signupMutation.isPending ? <AnimateLoader /> : "Complete Signup"}
                            </Button>
                        </div>
                    </>
                </>
            )}

        </form>
    );
}

function FieldError({ message }: { message: string }) {
    return (
        <p className="text-red-600 text-sm mt-1 dark:text-red-400">
            **{message}
        </p>
    );
}
