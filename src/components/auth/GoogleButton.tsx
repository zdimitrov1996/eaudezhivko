import { getTranslations } from "next-intl/server";
import { signInWithGoogle } from "@/actions/auth";
import { GoogleIcon } from "../icons";
import { SubmitButton } from "./FormBits";

export async function GoogleButton({ next }: { next?: string }) {
  const t = await getTranslations("Auth");

  return (
    <form action={signInWithGoogle}>
      {next && <input type="hidden" name="next" value={next} />}
      <SubmitButton className="btn btn-secondary w-full">
        <GoogleIcon />
        {t("google")}
      </SubmitButton>
    </form>
  );
}
