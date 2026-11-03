import { useState } from "react";

// Props every <XDialog> form wrapper takes; spread `dialog.props` into it.
export type FormDialogProps<TItem, TDefaults = object> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null = create.
  item: TItem | null;
  // Prefill for new items (e.g. the page's client/server), or context for an
  // edit (e.g. where the edit was opened from).
  defaults: TDefaults;
};

// Add/edit dialog state that pairs with the <XDialog> form wrappers, in the
// style of useConfirmDelete:
//
//   const clientDialog = useFormDialog<Client>();
//   <PageHeader onAdd={() => clientDialog.create()} />
//   <ClientsTable onEdit={clientDialog.edit} />
//   <ClientDialog {...clientDialog.props} />
export function useFormDialog<TItem, TDefaults = object>() {
  const [state, setState] = useState<{
    open: boolean;
    item: TItem | null;
    defaults: TDefaults;
  }>({ open: false, item: null, defaults: {} as TDefaults });

  return {
    create: (defaults = {} as TDefaults) =>
      setState({ open: true, item: null, defaults }),
    edit: (item: TItem, defaults = {} as TDefaults) =>
      setState({ open: true, item, defaults }),
    props: {
      ...state,
      // Keeps item/defaults while closing so the content doesn't change
      // mid-animation.
      onOpenChange: (open: boolean) =>
        setState((current) => ({ ...current, open })),
    } satisfies FormDialogProps<TItem, TDefaults>,
  };
}
