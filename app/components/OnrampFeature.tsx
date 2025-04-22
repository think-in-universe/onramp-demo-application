"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import type { SendTransactionParameters } from "@wagmi/core";
import { generateOnrampURL } from "../utils/rampUtils";
import {
  fetchBuyConfig,
  fetchBuyOptions,
  Country,
  PurchaseCurrency,
  Network,
  countryNames,
  FiatCurrency,
  PaymentCurrency,
} from "../utils/onrampApi";
import GeneratedLinkModal from "./GeneratedLinkModal";
import { fetchCryptoPrices } from "../utils/priceUtils";
import { WalletDefault } from "@coinbase/onchainkit/wallet";
import {
  BaseTokenInfo,
  DepositWidget,
  IntentsUserId,
  SwapWidget,
  UnifiedTokenInfo,
  WithdrawWidget,
} from "@defuse-protocol/defuse-sdk";
import { LIST_TOKENS } from "../utils/tokens";
import { useTokenList } from "../hooks/useTokenList";
import { renderAppLink } from "../utils/renderAppLink";
import { useEVMWalletActions } from "../hooks/useEVMWalletActions";
import { parseErc6492Signature, isErc6492Signature, verifyMessage } from "viem";
import { generateDepositAddress } from "../services/depositService";
import { BlockchainEnum } from "../utils/intents/poaBridge/constants/blockchains";
import { assetNetworkAdapter } from "../utils/intents/adapters";
import { SupportedChainName } from "../utils/intents/types/base";
import Image from "next/image";

// Define payment method descriptions
const PAYMENT_METHOD_DESCRIPTIONS: Record<string, string> = {
  CARD: "Debit or Credit Card (Available in most countries)",
  ACH_BANK_ACCOUNT: "Bank Transfer (ACH) - US only",
  APPLE_PAY: "Apple Pay - Available on iOS devices",
  GOOGLE_PAY: "Google Pay - Available on Android devices",
  SEPA: "SEPA Bank Transfer - Europe only",
  card: "Debit or Credit Card (Available in most countries)",
  ach: "Bank Transfer (ACH) - US only",
  apple_pay: "Apple Pay - Available on iOS devices",
  google_pay: "Google Pay - Available on Android devices",
  sepa: "SEPA Bank Transfer - Europe only",
};

// Currency symbols for common currencies
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  INR: "₹",
  RUB: "₽",
  BRL: "R$",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  HKD: "HK$",
  SGD: "S$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  ZAR: "R",
  MXN: "Mex$",
  AED: "د.إ",
  THB: "฿",
  TRY: "₺",
};

// Helper function to get currency symbol
const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

// Create an array from countryNames for the dropdown
const countryList = Object.entries(countryNames)
  .map(([code, name]) => ({
    code,
    name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Define asset-network compatibility mapping
const assetNetworkMap: Record<string, string[]> = {
  ETH: ["ethereum", "base", "optimism", "arbitrum", "polygon"],
  USDC: [
    "ethereum",
    "base",
    "optimism",
    "arbitrum",
    "polygon",
    "solana",
    "avalanche-c-chain",
    "unichain",
    "aptos",
    "bnb-chain",
    "near",
  ],
  BTC: ["bitcoin", "bitcoin-lightning"],
  SOL: ["solana"],
  MATIC: ["polygon", "ethereum"],
  AVAX: ["avalanche-c-chain"],
  ADA: ["cardano"],
  DOT: ["polkadot"],
  ATOM: ["cosmos"],
  XRP: ["xrp"],
  ALGO: ["algorand"],
  FIL: ["filecoin"],
  NEAR: ["near"],
  XLM: ["stellar"],
  TRX: ["tron"],
  // Add more mappings as needed
};

// Helper function to get default network for an asset
const getDefaultNetworkForAsset = (asset: string): string => {
  if (!assetNetworkMap[asset] || assetNetworkMap[asset].length === 0) {
    return "ethereum"; // Default fallback
  }
  return assetNetworkMap[asset][0]; // Return first compatible network
};

// US States list
const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

export default function OnrampFeature() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const [activeTab, setActiveTab] = useState<"api" | "url" | "intents">(
    "intents"
  );
  const [selectedAsset, setSelectedAsset] = useState("USDC");
  const [amount, setAmount] = useState("10");
  const [selectedNetwork, setSelectedNetwork] = useState("base");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [enableGuestCheckout, setEnableGuestCheckout] = useState(true);
  const [selectedPaymentCurrency, setSelectedPaymentCurrency] = useState("USD");
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [selectedState, setSelectedState] = useState("");
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const { sendTransactions } = useEVMWalletActions();
  const [depositAddress, setDepositAddress] = useState<string | undefined>(
    undefined
  );
  const [isNearIntents, setIsNearIntents] = useState(false);

  // const [signature, setSignature] = useState<Hex | undefined>(undefined);
  // const { signTypedData } = useSignTypedData({
  //   mutation: { onSuccess: (sig) => setSignature(sig) },
  // });

  const tokenList = useTokenList(LIST_TOKENS);

  // Define supported payment methods
  const paymentMethods = [
    {
      id: "CARD",
      name: "Debit Card",
      description: "Available in 90+ countries",
    },
    {
      id: "ACH_BANK_ACCOUNT",
      name: "Bank Transfer (ACH)",
      description: "US only",
    },
    { id: "APPLE_PAY", name: "Apple Pay", description: "US only" },
  ];

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    paymentMethods[0].id
  );

  // Define supported assets (expanded list)
  const assets = [
    { symbol: "ETH", name: "Ethereum", price: cryptoPrices["ETH"] || 3500 },
    { symbol: "USDC", name: "USD Coin", price: cryptoPrices["USDC"] || 1 },
    { symbol: "BTC", name: "Bitcoin", price: cryptoPrices["BTC"] || 67000 },
    { symbol: "SOL", name: "Solana", price: cryptoPrices["SOL"] || 140 },
    { symbol: "MATIC", name: "Polygon", price: cryptoPrices["MATIC"] || 0.8 },
    { symbol: "AVAX", name: "Avalanche", price: cryptoPrices["AVAX"] || 35 },
    { symbol: "ADA", name: "Cardano", price: cryptoPrices["ADA"] || 0.45 },
    { symbol: "DOT", name: "Polkadot", price: cryptoPrices["DOT"] || 7 },
    { symbol: "DOGE", name: "Dogecoin", price: cryptoPrices["DOGE"] || 0.1 },
    {
      symbol: "SHIB",
      name: "Shiba Inu",
      price: cryptoPrices["SHIB"] || 0.00002,
    },
    { symbol: "XRP", name: "XRP", price: cryptoPrices["XRP"] || 0.5 },
    { symbol: "LTC", name: "Litecoin", price: cryptoPrices["LTC"] || 80 },
    { symbol: "UNI", name: "Uniswap", price: cryptoPrices["UNI"] || 8 },
    { symbol: "LINK", name: "Chainlink", price: cryptoPrices["LINK"] || 15 },
    { symbol: "AAVE", name: "Aave", price: cryptoPrices["AAVE"] || 90 },
    { symbol: "ATOM", name: "Cosmos", price: cryptoPrices["ATOM"] || 8 },
    { symbol: "USDT", name: "Tether", price: cryptoPrices["USDT"] || 1 },
    { symbol: "DAI", name: "Dai", price: cryptoPrices["DAI"] || 1 },
    {
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      price: cryptoPrices["WBTC"] || 67000,
    },
    { symbol: "BCH", name: "Bitcoin Cash", price: cryptoPrices["BCH"] || 300 },
    { symbol: "APE", name: "ApeCoin", price: cryptoPrices["APE"] || 1.5 },
    { symbol: "XLM", name: "Stellar", price: cryptoPrices["XLM"] || 0.1 },
    { symbol: "FIL", name: "Filecoin", price: cryptoPrices["FIL"] || 5 },
    { symbol: "NEAR", name: "NEAR Protocol", price: cryptoPrices["NEAR"] || 5 },
    { symbol: "ALGO", name: "Algorand", price: cryptoPrices["ALGO"] || 0.15 },
    {
      symbol: "MANA",
      name: "Decentraland",
      price: cryptoPrices["MANA"] || 0.4,
    },
    { symbol: "SAND", name: "The Sandbox", price: cryptoPrices["SAND"] || 0.4 },
    { symbol: "TRX", name: "TRON", price: cryptoPrices["TRX"] || 0.1 },
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Define supported networks (expanded list)
  const networks = [
    { id: "ethereum", name: "Ethereum" },
    { id: "base", name: "Base" },
    { id: "optimism", name: "Optimism" },
    { id: "polygon", name: "Polygon" },
    { id: "arbitrum", name: "Arbitrum" },
    { id: "avalanche-c-chain", name: "Avalanche" },
    { id: "solana", name: "Solana" },
    { id: "bitcoin", name: "Bitcoin" },
    { id: "bitcoin-lightning", name: "Bitcoin Lightning" },
    { id: "cardano", name: "Cardano" },
    { id: "polkadot", name: "Polkadot" },
    { id: "cosmos", name: "Cosmos" },
    { id: "near", name: "NEAR Protocol" },
    { id: "flow", name: "Flow" },
    { id: "hedera", name: "Hedera" },
    { id: "algorand", name: "Algorand" },
    { id: "tezos", name: "Tezos" },
    { id: "stellar", name: "Stellar" },
    { id: "tron", name: "TRON" },
    { id: "filecoin", name: "Filecoin" },
    { id: "binance-smart-chain", name: "BNB Chain" },
    { id: "bnb-chain", name: "BNB Chain" },
    { id: "binance-chain", name: "Binance Chain" },
    { id: "fantom", name: "Fantom" },
    { id: "cronos", name: "Cronos" },
    { id: "gnosis", name: "Gnosis" },
    { id: "celo", name: "Celo" },
    { id: "moonbeam", name: "Moonbeam" },
    { id: "harmony", name: "Harmony" },
    { id: "unichain", name: "Unichain" },
    { id: "aptos", name: "Aptos" },
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Define supported payment currencies (expanded list)
  const paymentCurrencies = [
    { code: "USD", name: "US Dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "AUD", name: "Australian Dollar" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "CHF", name: "Swiss Franc" },
    { code: "HKD", name: "Hong Kong Dollar" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "SEK", name: "Swedish Krona" },
    { code: "NOK", name: "Norwegian Krone" },
    { code: "DKK", name: "Danish Krone" },
    { code: "PLN", name: "Polish Złoty" },
    { code: "NZD", name: "New Zealand Dollar" },
    { code: "MXN", name: "Mexican Peso" },
    { code: "BRL", name: "Brazilian Real" },
    { code: "ZAR", name: "South African Rand" },
    { code: "INR", name: "Indian Rupee" },
    { code: "TRY", name: "Turkish Lira" },
    { code: "ILS", name: "Israeli New Shekel" },
    { code: "AED", name: "UAE Dirham" },
    { code: "SAR", name: "Saudi Riyal" },
    { code: "KRW", name: "South Korean Won" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "THB", name: "Thai Baht" },
    { code: "IDR", name: "Indonesian Rupiah" },
    { code: "MYR", name: "Malaysian Ringgit" },
    { code: "PHP", name: "Philippine Peso" },
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Initialize network based on selected asset
  useEffect(() => {
    // Ensure the selected network is compatible with the selected asset
    if (assetNetworkMap[selectedAsset]) {
      const compatibleNetworks = assetNetworkMap[selectedAsset];
      if (!compatibleNetworks.includes(selectedNetwork)) {
        setSelectedNetwork(getDefaultNetworkForAsset(selectedAsset));
      }
    }
  }, [selectedAsset, selectedNetwork]);

  // Fetch cryptocurrency prices on component mount
  useEffect(() => {
    const getPrices = async () => {
      setIsLoadingPrices(true);
      try {
        const prices = await fetchCryptoPrices();
        setCryptoPrices(prices);
      } catch (error) {
        console.error("Failed to fetch cryptocurrency prices:", error);
      } finally {
        setIsLoadingPrices(false);
      }
    };

    getPrices();

    // Refresh prices every 60 seconds
    const intervalId = setInterval(getPrices, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch deposit address on component mount
  useEffect(() => {
    if (!address || !selectedNetwork) return;

    const fetchDepositAddress = async () => {
      let network = selectedNetwork;
      if (isNearIntents) {
        network = "base";
      }

      const intentsUserId = address.toLowerCase() as IntentsUserId;
      const chain = assetNetworkAdapter[network as SupportedChainName];

      console.log("fetching deposit address for", {
        address,
        intentsUserId,
        network,
        chain,
      });

      const depositAddress = await generateDepositAddress(intentsUserId, chain);
      setDepositAddress(depositAddress);
    };

    fetchDepositAddress();
  }, [address, selectedNetwork, isNearIntents]);

  useEffect(() => {
    // NEAR USDC onramp is not supported yet, so we deposit to
    // NEAR Intents deposit address, and withdraw USDC on NEAR
    if (selectedNetwork === "near" && selectedAsset === "USDC") {
      setIsNearIntents(true);
    }
  }, [selectedNetwork, selectedAsset]);

  // Handle asset change
  const handleAssetChange = (assetCode: string) => {
    setSelectedAsset(assetCode);

    // Update network based on the selected asset
    if (assetNetworkMap[assetCode]) {
      const compatibleNetworks = assetNetworkMap[assetCode];
      // If current network is not compatible with the new asset, update it
      if (!compatibleNetworks.includes(selectedNetwork)) {
        setSelectedNetwork(getDefaultNetworkForAsset(assetCode));
      }
    }
  };

  // Generate one-time URL
  const handleGenerateUrl = () => {
    if (!address && activeTab === "url") {
      alert("Please connect your wallet first");
      return;
    }

    const url = generateOnrampURL({
      asset: selectedAsset,
      amount,
      network: selectedNetwork,
      paymentMethod: selectedPaymentMethod,
      paymentCurrency: selectedPaymentCurrency,
      // Onramp to the NEAR intents deposit address
      address: depositAddress || "0x0000000000000000000000000000000000000000",
      redirectUrl: window.location.origin + "/onramp",
      enableGuestCheckout, // Add guest checkout option
    });

    setGeneratedUrl(url);
    setShowUrlModal(true);
  };

  // Handle direct onramp
  const handleOnramp = () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    // Note: This is a demo app - actual payments require ownership of
    // assets and sufficient funds
    const url = generateOnrampURL({
      asset: selectedAsset,
      amount,
      network: selectedNetwork,
      paymentMethod: selectedPaymentMethod,
      paymentCurrency: selectedPaymentCurrency,
      // Onramp to the NEAR intents deposit address
      address: depositAddress || "0x0000000000000000000000000000000000000000",
      redirectUrl: window.location.origin + "/onramp",
      enableGuestCheckout, // Add guest checkout option
    });

    window.open(url, "_blank");
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(generatedUrl);
    alert("URL copied to clipboard!");
  };

  const handleOpenUrl = () => {
    window.open(generatedUrl, "_blank");
  };

  const sendTransaction = async (
    tx: SendTransactionParameters
  ): Promise<string> => {
    const result = await sendTransactions(tx as SendTransactionParameters);
    if (result === undefined) {
      throw new Error(`Transaction failed for EVM`);
    }
    return result;
  };

  return (
    <div className="bg-white dark:bg-gray-900 py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-6 dark:text-white">
                Configure Your Onramp
              </h3>

              {/* Integration Method Tabs */}
              <div className="mb-8">
                <div className="flex space-x-2 mb-4">
                  <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      activeTab === "intents"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200"
                    }`}
                    onClick={() => setActiveTab("intents")}
                    aria-label="Switch to Intents"
                  >
                    Intents
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      activeTab === "api"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200"
                    }`}
                    onClick={() => setActiveTab("api")}
                    aria-label="Switch to Onramp API"
                  >
                    Onramp API
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      activeTab === "url"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200"
                    }`}
                    onClick={() => setActiveTab("url")}
                    aria-label="Switch to One-time Payment Link"
                  >
                    One-time Payment Link
                  </button>
                </div>
              </div>

              {/* Connect Wallet Button */}
              {!isConnected && (
                <div className="mb-6">
                  <button
                    onClick={() => {
                      if (connectors.length > 0) {
                        connect({ connector: connectors[0] });
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    Connect Wallet
                  </button>
                </div>
              )}

              {/* Country Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">
                  Country
                </label>
                <div className="relative">
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="block w-full bg-white text-gray-800 border border-gray-300 rounded-lg py-3 px-4 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {countryList.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* State Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">
                  State
                </label>
                <div className="relative">
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="block w-full bg-white text-gray-800 border border-gray-300 rounded-lg py-3 px-4 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {US_STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Asset Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">
                  Select Asset
                </label>
                <div className="relative">
                  <select
                    value={selectedAsset}
                    onChange={(e) => handleAssetChange(e.target.value)}
                    className="block w-full bg-white text-gray-800 border border-gray-300 rounded-lg py-3 px-4 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {assets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.name} ({asset.symbol})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Network Selection - Moved right after Asset Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">
                  Network
                </label>
                <div className="relative">
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="block w-full bg-white text-gray-800 border border-gray-300 rounded-lg py-3 px-4 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {/* Filter networks based on selected asset */}
                    {networks
                      .filter(
                        (network) =>
                          !assetNetworkMap[selectedAsset] ||
                          assetNetworkMap[selectedAsset].includes(network.id)
                      )
                      .map((network) => (
                        <option key={network.id} value={network.id}>
                          {network.name}
                        </option>
                      ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {assetNetworkMap[selectedAsset] &&
                    `${selectedAsset} is available on ${
                      assetNetworkMap[selectedAsset].length
                    } network${
                      assetNetworkMap[selectedAsset].length > 1 ? "s" : ""
                    }`}
                </p>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">
                  Amount
                </label>
                <div className="flex space-x-2 mb-2">
                  <button
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-800 font-medium transition-colors"
                    onClick={() => setAmount("10")}
                  >
                    {getCurrencySymbol(selectedPaymentCurrency)}10
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-800 font-medium transition-colors"
                    onClick={() => setAmount("25")}
                  >
                    {getCurrencySymbol(selectedPaymentCurrency)}25
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-800 font-medium transition-colors"
                    onClick={() => setAmount("50")}
                  >
                    {getCurrencySymbol(selectedPaymentCurrency)}50
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-700">
                    {getCurrencySymbol(selectedPaymentCurrency)}
                  </span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full bg-white border border-gray-300 rounded-lg py-3 pl-8 pr-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              {/* Payment Currency Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">
                  Payment Currency
                </label>
                <div className="relative">
                  <select
                    value={selectedPaymentCurrency}
                    onChange={(e) => setSelectedPaymentCurrency(e.target.value)}
                    className="block w-full bg-white text-gray-800 border border-gray-300 rounded-lg py-3 px-4 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {paymentCurrencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">
                  Payment Method
                </label>
                <div className="relative">
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="block w-full bg-white text-gray-800 border border-gray-300 rounded-lg py-3 px-4 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                {PAYMENT_METHOD_DESCRIPTIONS[selectedPaymentMethod] && (
                  <p className="text-sm text-gray-500 mt-2">
                    {PAYMENT_METHOD_DESCRIPTIONS[selectedPaymentMethod]}
                  </p>
                )}
              </div>

              {/* Guest Checkout Toggle */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 font-medium">
                    Enable Guest Checkout
                  </label>
                  <div
                    className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out rounded-full ${
                      enableGuestCheckout ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    onClick={() => setEnableGuestCheckout(!enableGuestCheckout)}
                  >
                    <span
                      className={`absolute left-1 top-1 w-4 h-4 transition-transform duration-200 ease-in-out bg-white rounded-full ${
                        enableGuestCheckout ? "transform translate-x-6" : ""
                      }`}
                    ></span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Allow users to checkout without a Coinbase account
                </p>
              </div>

              {/* Deposit Address */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <span className="mr-2">
                    <Image
                      src="/near-intents.png"
                      alt="NEAR Intents Logo"
                      width={16}
                      height={16}
                      className="rounded-md"
                    />
                  </span>
                  <label className="text-gray-700 font-medium">
                    NEAR Intents Deposit Address
                  </label>
                </div>
                <p className="text-sm text-gray-500">{depositAddress}</p>
              </div>

              {/* Action Button */}
              {activeTab === "api" ? (
                <button
                  onClick={handleOnramp}
                  disabled={!isConnected}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                    isConnected
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                      : "bg-gray-600 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  {isConnected ? "Start Onramp" : "Connect Wallet to Continue"}
                </button>
              ) : (
                <button
                  onClick={handleGenerateUrl}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  Generate Payment Link
                </button>
              )}
            </div>

            {/* Preview Section */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 flex flex-col">
              <h3 className="text-xl font-bold mb-6 dark:text-white">
                Preview
              </h3>

              <div className="flex-grow flex items-center justify-center">
                {activeTab === "intents" ? (
                  <div className="text-center" style={{ display: "none" }}>
                    <div>
                      <h1>Deposit</h1>
                      <DepositWidget
                        tokenList={tokenList}
                        userAddress={address || undefined}
                        chainType={"evm"}
                        sendTransactionEVM={async ({ from, ...tx }) => {
                          const result = await sendTransaction({
                            ...tx,
                            account: from,
                          });
                          return Array.isArray(result)
                            ? result[0].transaction.hash
                            : result;
                        }}
                        renderHostAppLink={renderAppLink}
                        sendTransactionNear={async () => null}
                        sendTransactionSolana={async () => null}
                      />
                    </div>

                    <div>
                      <h1>Swap</h1>
                      <SwapWidget
                        theme="dark"
                        tokenList={tokenList}
                        userAddress={address || null}
                        userChainType={"evm"}
                        signMessage={async (params) => {
                          const message = params.ERC191.message;
                          const signature = await signMessageAsync({
                            message,
                          });
                          const signatureData =
                            parseErc6492Signature(signature).signature;

                          console.log("signed swap message", {
                            message,
                            signature,
                            signatureData,
                            erc6492: isErc6492Signature(signature),
                            parsed: parseErc6492Signature(signature),
                            equal: signatureData === signature,
                          });

                          verifyMessage({
                            address: address! as `0x${string}`,
                            message,
                            signature,
                          })
                            .then(console.log)
                            .catch(console.error);

                          return {
                            type: "ERC191",
                            signatureData,
                            signedData: { message },
                          };
                        }}
                        sendNearTransaction={async () => {
                          const result = { txHash: "123" };
                          return result;
                        }}
                        onSuccessSwap={() => {}}
                        renderHostAppLink={renderAppLink}
                      />
                    </div>

                    <div>
                      <h1>Withdraw</h1>
                      <WithdrawWidget
                        tokenList={tokenList}
                        userAddress={address || undefined}
                        chainType={"evm"}
                        sendNearTransaction={async () => null}
                        signMessage={async (params) => {
                          const message = params.ERC191.message;

                          // const signature = await signTypedData(message);
                          const signature = await signMessageAsync({
                            message,
                          });
                          const signatureData =
                            parseErc6492Signature(signature).signature;

                          console.log("signed withdraw message", {
                            message,
                            signature,
                            signatureData,
                          });
                          return {
                            type: "ERC191",
                            signatureData,
                            signedData: { message },
                          };
                        }}
                        renderHostAppLink={renderAppLink}
                      />
                    </div>
                  </div>
                ) : activeTab === "api" ? (
                  <div className="text-center">
                    <div
                      className={`inline-block font-medium py-3 px-8 rounded-lg transition-all shadow-md hover:shadow-lg mb-4 cursor-pointer ${
                        isConnected
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-gray-600 text-gray-300 cursor-not-allowed"
                      }`}
                      onClick={
                        isConnected
                          ? handleOnramp
                          : () => alert("Please connect your wallet first")
                      }
                    >
                      Buy with Coinbase
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      A simple button that opens the Coinbase Onramp flow
                    </p>
                  </div>
                ) : (
                  <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 border border-gray-300">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-800">
                        One-time Payment Link
                      </h4>
                      <span className="text-blue-600">
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path>
                        </svg>
                      </span>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-1">
                        {"You'll Pay"}
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        {getCurrencySymbol(selectedPaymentCurrency)}
                        {amount}
                        {getCurrencySymbol(selectedPaymentCurrency) ===
                        selectedPaymentCurrency
                          ? ` ${selectedPaymentCurrency}`
                          : ""}
                        {isLoadingPrices && (
                          <span className="text-sm text-gray-500 ml-2">
                            (updating prices...)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-1">Location</div>
                      <div className="text-gray-800">
                        {countryNames[selectedCountry] || selectedCountry}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-1">
                        {"You'll Receive"}
                      </div>
                      <div className="flex items-center text-gray-800">
                        <span className="mr-1">
                          {(() => {
                            const selectedAssetObj = assets.find(
                              (a) => a.symbol === selectedAsset
                            );
                            if (selectedAssetObj && selectedAssetObj.price) {
                              const cryptoAmount =
                                parseFloat(amount) / selectedAssetObj.price;
                              // Format based on the asset
                              if (
                                selectedAsset === "BTC" ||
                                selectedAsset === "WBTC"
                              ) {
                                return cryptoAmount.toFixed(7);
                              } else if (selectedAsset === "SHIB") {
                                return cryptoAmount.toFixed(0);
                              } else {
                                return cryptoAmount.toFixed(6);
                              }
                            }
                            return amount;
                          })()}
                        </span>
                        <span>{selectedAsset}</span>
                        <span className="ml-1">
                          {" "}
                          on{" "}
                          {networks.find((n) => n.id === selectedNetwork)
                            ?.name || selectedNetwork}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-1">
                        Payment Method
                      </div>
                      <div className="text-gray-800">
                        {paymentMethods.find(
                          (m) => m.id === selectedPaymentMethod
                        )?.name || selectedPaymentMethod}
                      </div>
                    </div>
                    <button
                      onClick={handleGenerateUrl}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
                    >
                      Generate Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* URL Modal */}
          {showUrlModal && (
            <GeneratedLinkModal
              title="Generated Onramp URL"
              url={generatedUrl}
              onClose={() => setShowUrlModal(false)}
              onCopy={handleCopyUrl}
              onOpen={handleOpenUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}
