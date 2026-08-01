"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegisters, useOpenRegisterSession } from "@/hooks/use-register-session";
import { ApiError } from "@/lib/api-client";

export function OpenRegisterDialog({ branchId }: { branchId: string }) {
  const { data: registers } = useRegisters(branchId);
  const [registerId, setRegisterId] = React.useState<string>("");
  const [openingCash, setOpeningCash] = React.useState("0");
  const openSession = useOpenRegisterSession();

  React.useEffect(() => {
    if (registers && registers.length > 0 && !registerId) setRegisterId(registers[0].id);
  }, [registers, registerId]);

  async function handleOpen() {
    if (!registerId) {
      toast.error("Select a cash register first");
      return;
    }
    try {
      await openSession.mutateAsync({ registerId, openingCash: Number(openingCash) || 0 });
      toast.success("Register session opened");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not open register session");
    }
  }

  return (
    <Dialog open>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Open register</DialogTitle>
          <DialogDescription>Start a new till session before taking sales at this branch.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cash register</Label>
            <Select value={registerId} onValueChange={setRegisterId}>
              <SelectTrigger>
                <SelectValue placeholder="Select register" />
              </SelectTrigger>
              <SelectContent>
                {registers?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Opening cash (NPR)</Label>
            <Input type="number" min={0} value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleOpen} disabled={openSession.isPending} className="w-full">
            {openSession.isPending ? "Opening…" : "Open register & start selling"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
