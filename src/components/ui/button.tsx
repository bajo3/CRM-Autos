import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "ghost" | "outline" | "destructive";
type Size = "default" | "sm" | "icon";

const variantClasses: Record<Variant, string> = {
  default: "bg-slate-900 text-white hover:bg-slate-800",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  ghost: "hover:bg-slate-100 text-slate-900",
  outline: "border border-slate-200 hover:bg-slate-50 text-slate-900",
  destructive: "bg-rose-600 text-white hover:bg-rose-700",
};

const sizeClasses: Record<Size, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  icon: "h-10 w-10",
};

type AsChildProps = {
  asChild?: boolean;
  children?: React.ReactNode;
};

type ButtonAsButton = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: false;
};

type ButtonAsChild = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  asChild: true;
};

export interface ButtonProps extends AsChildProps {
  variant?: Variant;
  size?: Size;
}

type Props = ButtonProps & (ButtonAsButton | ButtonAsChild);

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "default", size = "default", asChild, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<any>;
      return React.cloneElement(child, {
        className: cn(classes, child.props?.className),
        ...props,
      });
    }

    return (
      <button ref={ref} className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
