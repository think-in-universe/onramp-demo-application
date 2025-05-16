"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import { verifyMessage, http, createConfig } from "@wagmi/core";
import { useCoinbaseRampTransaction } from "../contexts/CoinbaseRampTransactionContext";
import { setSession } from "../queries";
import { SiweMessage } from "siwe";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Address, Avatar, Name, Identity } from "@coinbase/onchainkit/identity";
import { color } from "@coinbase/onchainkit/theme";

// import { base, mainnet } from "@wagmi/core/chains";

// export const config = createConfig({
//   chains: [mainnet],
//   transports: {
//     [mainnet.id]: http(),
//   },
// });

interface IWalletConnectorProps {
  hideAddress?: boolean;
  hideEns?: boolean;
  buttonStyle?: string;
}

export const WalletConnector = ({
  hideAddress = false,
  hideEns = false,
  buttonStyle = "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors",
}: IWalletConnectorProps) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const {
    setRampTransaction,
    rampTransaction,
    authenticated,
    setAuthenticated,
  } = useCoinbaseRampTransaction();

  // Auto sign-in when wallet is connected
  useEffect(() => {
    if (isConnected && address && !authenticated && !isSigningIn) {
      handleSignIn();
    }
  }, [isConnected, address, authenticated]);

  useEffect(() => {
    if (authenticated && address && rampTransaction?.wallet !== address) {
      setRampTransaction({
        ...rampTransaction,
        wallet: address,
      });
    } else if (!authenticated && rampTransaction?.wallet !== undefined) {
      setRampTransaction({
        ...rampTransaction,
        wallet: undefined,
      });
    }
  }, [authenticated, address, setRampTransaction, rampTransaction]);

  const handleConnect = async () => {
    if (connectors.length) {
      await connect({
        connector: connectors[0],
      });
    }
  };

  const handleSignIn = async () => {
    if (!address) return;
    setIsSigningIn(true);

    try {
      // Create a SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in with Ethereum to Coinbase Ramp.",
        uri: window.location.origin,
        version: "1",
        chainId: 1,
        nonce: Math.random().toString(36).substring(2, 10),
      });

      // Sign the message
      const _message = message.prepareMessage();
      const signature = await signMessageAsync({
        message: _message,
      });

      // console.log("signed message", {
      //   message: _message,
      //   signature,
      // });

      // const result = await verifyMessage(config, {
      //   address: address as `0x${string}`,
      //   message: _message,
      //   signature,
      // });
      // console.log("verifyMessage result", result);

      // Mock session setup
      await setSession({
        message,
        signature,
      });

      setAuthenticated(true);
    } catch (err) {
      console.error("Error occurred when authenticating user", err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDisconnect = () => {
    // Clear the session cookie
    document.cookie = `coinbase-ramp-demo-app-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`;
    setAuthenticated(false);
  };

  // If not connected, show connect button
  if (!isConnected) {
    return (
      <button onClick={handleConnect} className={buttonStyle}>
        Connect Wallet
      </button>
    );
  }

  // If connected and authenticated, show wallet info with dropdown
  return (
    <div className="flex justify-end">
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          {!hideEns && <Name />}
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            {!hideAddress && <Address className={color.foregroundMuted} />}
          </Identity>
          <div
            className="px-4 py-2 text-red-500 cursor-pointer hover:bg-gray-100"
            onClick={handleDisconnect}
          >
            Disconnect
          </div>
        </WalletDropdown>
      </Wallet>
    </div>
  );
};

export default WalletConnector;
