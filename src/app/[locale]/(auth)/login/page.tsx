import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/features/auth/LoginForm";

export default async function LoginPage() {
  const t = await getTranslations("auth.login");
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          {t("createAccount")}
        </Link>
      </p>
    </>
  );
}
