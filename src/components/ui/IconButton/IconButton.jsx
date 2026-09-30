import type { ButtonHTMLAttributes, ReactNode } from "react";


type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: ReactNode;
    label: string;
};

export function IconButton({
    icon,
    label,
    ...props
}: IconButtonProps {
    return (
        <button type="button"
        aria-label={label}
        {...props}>
        {icon}
        </button>
    );
}