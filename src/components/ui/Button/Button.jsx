import type { ButtonHTMLAttributes } from "react";


type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
};

export function Button