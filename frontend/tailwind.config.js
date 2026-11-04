/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(230 15% 7%)",
        foreground: "hsl(210 12% 88%)",
        card: "hsl(230 15% 10%)",
        "card-foreground": "hsl(210 12% 88%)",
        border: "hsl(230 12% 18%)",
        input: "hsl(230 12% 18%)",
        primary: "hsl(262 80% 60%)",
        "primary-foreground": "hsl(0 0% 100%)",
        accent: "hsl(262 80% 60%)",
        muted: "hsl(230 10% 24%)",
        "muted-foreground": "hsl(210 10% 60%)",
        ring: "hsl(262 80% 60%)",
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
    },
  },
  plugins: [],
};
