import { useState } from "react";
import { toast } from "@/lib/toast";

// Confirm-before-delete state that pairs with <AlertDialog>: `request(item)`
// opens the dialog, confirming runs `remove`, closes on success and toasts
// the outcome. The title stays at the call site:
//
//   const deleteDialog = useConfirmDelete<Domain>({
//     remove: (domain) => remove.mutateAsync(domain.id),
//     description: (domain) => `Domain "${domain.hostname}" will be deleted.`,
//   });
//   <AlertDialog title="Delete domain" {...deleteDialog.props} />
export function useConfirmDelete<T>(options: {
  remove: (item: T) => Promise<unknown>;
  description: (item: T) => string;
  // Appended to the failure toast, e.g. a hint about blocking references.
  errorSuffix?: string;
}) {
  const [item, setItem] = useState<T | null>(null);
  const [pending, setPending] = useState(false);

  const onConfirm = async () => {
    if (!item) return;
    setPending(true);
    try {
      await options.remove(item);
      setItem(null);
      toast.success("Deleted");
    } catch (deleteError) {
      toast.error(
        "Could not delete",
        `${(deleteError as Error).message}${options.errorSuffix ?? ""}`,
      );
    } finally {
      setPending(false);
    }
  };

  return {
    request: (item: T) => setItem(item),
    props: {
      open: item !== null,
      onOpenChange: (open: boolean) => {
        if (!open) setItem(null);
      },
      description: item !== null ? options.description(item) : undefined,
      confirmLabel: "Delete",
      danger: true,
      pending,
      onConfirm,
    },
  };
}
