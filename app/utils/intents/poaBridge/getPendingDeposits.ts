/* eslint-disable prettier/prettier */
import type { IntentsUserId } from "../types/intentsUserId";
import { wait } from "../wait";
import { getDepositStatus, type types } from "./poaBridgeHttpClient";

type PendingDeposit =
  types.GetDepositStatusResponse["result"]["deposits"][number] & {
    status: "PENDING";
  };

export type GetPendingDepositsOkType = PendingDeposit[];

export type GetPendingDepositsErrorType = types.JSONRPCErrorType;

export async function getPendingDeposits(
  accountId: IntentsUserId
): Promise<GetPendingDepositsOkType> {
  const depositStatus = await getDepositStatus({
    account_id: accountId,
  });

  return depositStatus.deposits.filter(
    (a): a is PendingDeposit => a.status === "PENDING"
  );
}

export async function waitForDepositsCompletion(
  accountId: IntentsUserId
) {
  let pendingDeposits = await getPendingDeposits(accountId);
  while (pendingDeposits.length > 0) {
    console.log(
      `Waiting for deposits to complete: ${JSON.stringify(pendingDeposits, null, 2)}`
    );
    await wait(1000);
    pendingDeposits = await getPendingDeposits(accountId);
  }
}
