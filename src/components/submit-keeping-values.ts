import { startTransition, type FormEvent } from "react";

/**
 * onSubmit handler that runs a useActionState action without React's automatic
 * form reset, so a failed submission keeps what the user typed.
 */
export function submitKeepingValues(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
