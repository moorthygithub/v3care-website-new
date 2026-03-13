import React, { useEffect, useState } from "react";
import OtpInput from "react-otp-input";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import axios from "axios";

import { Trash2 } from "lucide-react";
import DefaultHelmet from "../../components/DefaultHelmet/DefaultHelmet";
import { BASE_URL } from "../../config/BaseUrl";
import {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "../../firebase/firebase-auth";
import {
  clearCart,
  removeFromCart,
  updateCartItems,
} from "../../redux/slices/CartSlice";

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartItems = useSelector((state) => state.cart.items);
  const [isSmallScreen, setIsSmallScreen] = React.useState(
    window.innerWidth < 600,
  );
  // const [showBreakdown, setShowBreakdown] = React.useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const branch_id = localStorage.getItem("branch_id");
  const autoCompleteRef = React.useRef(null);
  const [timeSlot, setTimeSlot] = useState([]);
  const [timeLoading, setTimeLoading] = useState(false);

  const [firebaseAvailable, setFirebaseAvailable] = React.useState(true);

  let autoComplete;

  // for otp
  const [otpSent, setOtpSent] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [resendTimer, setResendTimer] = React.useState(0);
  const resendIntervalRef = React.useRef(null);
  const [confirmationResult, setConfirmationResult] = React.useState(null);
  const [verificationMethod, setVerificationMethod] =
    React.useState("whatsapp");
  // Check Firebase availability on component mount
  React.useEffect(() => {
    const checkFirebase = async () => {
      try {
        // Test Firebase configuration
        await auth.app.options;
        setFirebaseAvailable(true);
      } catch (error) {
        console.error("Firebase initialization error:", error);
        setFirebaseAvailable(false);
        showNotification(
          "Some verification features are temporarily unavailable",
          "warning",
          true,
        );
      }
    };

    checkFirebase();
  }, []);
  React.useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Group items by service and service sub
  const groupedItems = cartItems.reduce((acc, item) => {
    const key = `${item.service_id}-${item.service_sub_id || "none"}`;
    if (!acc[key]) {
      acc[key] = {
        service_name: item.service_name,
        service_sub_name: item.service_sub_name,
        items: [],
        total: 0,
        originalTotal: 0,
      };
    }
    acc[key].items.push(item);
    acc[key].total += parseFloat(item.service_price_amount);
    acc[key].originalTotal += parseFloat(item.service_price_rate);
    return acc;
  }, {});

  // Calculate overall totals
  const totalPrice = Object.values(groupedItems).reduce(
    (sum, group) => sum + group.total,
    0,
  );
  const totalOriginalPrice = Object.values(groupedItems).reduce(
    (sum, group) => sum + group.originalTotal,
    0,
  );

  const [formData, setFormData] = React.useState({
    order_date: new Date().toISOString().split("T")[0],
    order_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    order_refer_by: "website",
    order_customer: "",
    order_customer_mobile: "",
    order_customer_email: "",
    order_service_date: "",
    order_service: "",
    order_service_sub: "",
    order_service_price_for: "",
    order_service_price: "",
    order_amount: "",
    order_time: "",
    branch_id: branch_id || "",
    order_km: "0",
    order_address: "",
    order_url: "",
    order_locality: "",
    order_sub_locality: "",
    order_flat: "",
    order_landmark: "",
    order_remarks: "",
    order_building: "",
    order_advance: "",
    order_comment: "",
    order_area: "",
    order_discount: "",
    order_custom: "",
    order_custom_price: "",
    order_payment_amount: "",
    order_payment_type: "",
    order_transaction_details: "",
  });
  const sendWhatsAppNotification = async (mobile) => {
    try {
      await axios.post(`${BASE_URL}/api/panel-send-web-booking-whatsapp`, {
        order_customer_mobile: mobile,
      });
    } catch (error) {
      console.error("Failed to send WhatsApp notification:", error);
    }
  };
  const showNotification = (message, type, persistent = false) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, message, type, persistent }]);

    // Only set auto-remove timeout for non-persistent notifications
    if (!persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }
  };
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };
  const fetchTimeSlot = async () => {
    try {
      setTimeLoading(true);
      const response = await axios.get(
        `${BASE_URL}/api/panel-fetch-timeslot-out`,
      );
      setTimeSlot(response.data.timeslot || []);
    } catch (err) {
      console.error("Error fetching timeslot:", err);
    } finally {
      setTimeLoading(false);
    }
  };
  useEffect(() => {
    fetchTimeSlot();
  }, []);
  const validateForm = () => {
    const requiredFields = [
      "order_customer",
      "order_customer_mobile",
      "order_customer_email",
      "order_service_date",
      "order_time",
      "order_address",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        showNotification(
          `Please fill in the ${field
            .replace("order_", "")
            .replace("_", " ")} field`,
          "error",
        );
        return false;
      }
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.order_customer_mobile)) {
      showNotification(
        "Please enter a valid 10-digit Indian mobile number",
        "error",
      );
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.order_customer_email)) {
      showNotification("Please enter a valid email address", "error");
      return false;
    }

    if (cartItems.length === 0) {
      showNotification("Please add at least one service to your cart", "error");
      return false;
    }

    return true;
  };

  const handleScriptLoad = (updateQuery, autoCompleteRef) => {
    try {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Google Maps Places API not available");
        return;
      }
      autoComplete = new window.google.maps.places.Autocomplete(
        autoCompleteRef.current,
        {
          componentRestrictions: { country: "IN" },
        },
      );
      autoComplete.addListener("place_changed", () => {
        handlePlaceSelect(updateQuery);
      });
    } catch (error) {
      console.error("Error initializing Google Maps Autocomplete:", error);
    }
  };

  const handlePlaceSelect = async (updateQuery) => {
    try {
      if (!autoComplete) {
        console.error("Autocomplete not initialized");
        return;
      }

      const addressObject = await autoComplete.getPlace();

      if (!addressObject || !addressObject.address_components) {
        console.error("Invalid address object received");
        return;
      }

      // console.log("address.address_components", addressObject.address_components);
      const query = addressObject.formatted_address;
      const url = addressObject.url;
      updateQuery(query);
      let subLocality = "";
      let locality = "";

      addressObject.address_components.forEach((component) => {
        if (component.types.includes("sublocality_level_1")) {
          subLocality = component.short_name;
        }
        if (component.types.includes("locality")) {
          locality = component.short_name;
        }
      });

      setFormData((prev) => ({
        ...prev,
        order_address: query,
        order_url: url,
        order_sub_locality: subLocality,
        order_locality: locality,
      }));
    } catch (error) {
      console.error("Error handling place selection:", error);
    }
  };

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      handleScriptLoad(setQuery, autoCompleteRef);
    }
  }, []);

  const fetchPricesForAllServices = async (date) => {
    if (cartItems.length === 0) return;

    setIsLoadingPrices(true);

    try {
      const serviceRequests = Object.keys(groupedItems).map(async (key) => {
        const group = groupedItems[key];
        const payload = {
          branch_id: branch_id,
          order_service: group.items[0].service_slug,
          order_service_sub: group.items[0].service_sub_slug || "",
          order_service_date: date,
        };

        const response = await axios.post(
          `${BASE_URL}/api/panel-fetch-web-service-price-out`,
          payload,
        );

        return {
          service_id: group.items[0].service_id,
          service_sub_id: group.items[0].service_sub_id || "",
          prices: response.data.serviceprice || [],
        };
      });

      const priceResults = await Promise.all(serviceRequests);

      const updatedCartItems = cartItems.map((item) => {
        const priceResult = priceResults.find(
          (result) =>
            result.service_id === item.service_id &&
            result.service_sub_id === (item.service_sub_id || ""),
        );

        if (priceResult) {
          const matchedPrice = priceResult.prices.find(
            (price) => price.service_price_for === item.service_price_for,
          );

          if (matchedPrice) {
            return {
              ...item,
              service_price_rate: matchedPrice.service_price_rate,
              service_price_amount: matchedPrice.service_price_amount,
              service_label: matchedPrice.status_label,
            };
          }
        }
        return item;
      });

      dispatch(updateCartItems(updatedCartItems));
    } catch (error) {
      console.error("Error fetching prices:", error);
      showNotification("Failed to update prices for selected date", "error");
    } finally {
      setIsLoadingPrices(false);
    }
  };
  const validateOnlyDigits = (inputtxt) => {
    const phoneno = /^\d+$/;
    return phoneno.test(inputtxt) || inputtxt.length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "order_service_date") {
      fetchPricesForAllServices(value);
    }

    if (name === "order_customer_mobile" && !validateOnlyDigits(value)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitPayLater = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    if (!validateForm()) {
      return;
    }
    const bookingData = cartItems.map((item) => ({
      order_service_price_for: item.id,
      order_service_price: item.service_price_rate,
      order_amount: item.service_price_amount,
      order_remarks: formData.order_remarks,
      order_service: item.service_id || "",
      order_service_sub: item.service_sub_id || "",
      ...Object.fromEntries(
        Object.entries(formData).filter(
          ([key]) =>
            ![
              "order_service_price_for",
              "order_service_price",
              "order_amount",
              "order_service",
              "order_service_sub",
            ].includes(key),
        ),
      ),
    }));
    try {
      const finalFormData = {
        booking_data: bookingData,
      };

      const response = await axios.post(
        `${BASE_URL}/api/panel-create-web-booking-out`,
        finalFormData,
      );

      if (response.data.code == 200) {
        showNotification(response.data.msg || "Booking successful", "success");
        dispatch(clearCart());
        navigate("/payment-success", {
          state: {
            amount: totalPrice,
            bookingId: response?.data?.bookig_id,
            originalAmount: totalOriginalPrice,
            payment_mode: "pay_later",
            payment_status: "pending",
            booking_status: "confirmed",
            booking_data: bookingData,
            selected_prices: cartItems,
            groupedItems: groupedItems,
            customer_details: formData,
          },
        });
      } else {
        console.error(response.data.msg || "Failed to create booking");
        navigate("/booking-failed", {
          state: {
            error: response.data.msg || "Booking creation failed",
            amount: totalPrice,
            originalAmount: totalOriginalPrice,
            service_name: cartItems[0]?.service_name,
            service_sub_name: cartItems[0]?.service_sub_name,
            booking_data: bookingData,
            selected_prices: cartItems,
            groupedItems: groupedItems,
            customer_details: formData,
          },
        });
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      navigate("/booking-failed", {
        state: {
          error: error instanceof Error ? error.message : "Booking failed",
          amount: totalPrice,

          booking_data: bookingData,
          selected_prices: cartItems,
          groupedItems: groupedItems,
          customer_details: formData,
        },
      });
    }
  };

  const sendOtp = async () => {
    if (!validateForm()) {
      return;
    }

    if (!firebaseAvailable) {
      await sendWhatsAppNotification(formData.order_customer_mobile);
      showNotification(
        "We got your query. We will get back to you soon.",
        "success",
      );
      return;
    }

    setIsSendingOtp(true);

    if (!formData.order_customer_mobile) {
      showNotification("Mobile number is required", "error");
      setIsSendingOtp(false);
      return;
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.order_customer_mobile)) {
      showNotification(
        "Please enter a valid 10-digit Indian mobile number",
        "error",
      );
      setIsSendingOtp(false);
      return;
    }

    try {
      const phoneNumber = `+91${formData.order_customer_mobile}`;
      const tempContainer = document.createElement("div");
      tempContainer.id = "temp-recaptcha-container";
      tempContainer.style.display = "none";
      document.body.appendChild(tempContainer);

      const appVerifier = new RecaptchaVerifier(
        auth,
        "temp-recaptcha-container",
        {
          size: "invisible",
          "expired-callback": async () => {
            showNotification(
              "Security verification expired. Please try again.",
              "error",
            );
            await sendWhatsAppNotification(formData.order_customer_mobile);
            showNotification(
              "We got your query. We will get back to you soon.",
              "success",
            );
          },
        },
      );

      const result = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier,
      );

      document.body.removeChild(tempContainer);

      setConfirmationResult(result);
      setOtpSent(true);
      showNotification("OTP sent to your mobile number", "success");

      setResendTimer(30);
      resendIntervalRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            if (resendIntervalRef.current) {
              clearInterval(resendIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timerInterval);
      };
    } catch (error) {
      console.error("Error in OTP process:", error);

      const tempContainer = document.getElementById("temp-recaptcha-container");
      if (tempContainer) {
        document.body.removeChild(tempContainer);
      }
      // Handle Firebase-specific errors
      if (
        error.code?.includes("auth/") ||
        error.message?.includes("Firebase")
      ) {
        setFirebaseAvailable(false);
        showNotification(
          "Verification service temporarily unavailable",
          "warning",
        );

        // Fallback to WhatsApp notification
        await sendWhatsAppNotification(formData.order_customer_mobile);
        showNotification(
          "We got your query. We will get back to you soon.",
          "success",
        );
        return;
      }
      let errorMessage = "Failed to send OTP. Please try again.";

      if (error.code === "auth/invalid-phone-number") {
        errorMessage = "Invalid phone number format";
      } else if (error.code === "auth/missing-phone-number") {
        errorMessage = "Phone number is required";
      } else if (error.code === "auth/quota-exceeded") {
        errorMessage = "SMS quota exceeded. Please try again later.";
      } else if (error.code === "auth/captcha-check-failed") {
        errorMessage = "Recaptcha verification failed.";
      } else if (error.message.includes("reCAPTCHA")) {
        errorMessage = "Security verification failed. Please try again.";
      } else if (error.code === "auth/argument-error") {
        errorMessage =
          "Security verification failed. Please refresh the page and try again.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      showNotification(errorMessage, "error");
      await sendWhatsAppNotification(formData.order_customer_mobile);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showNotification("Please enter a valid 6-digit OTP", "error");
      return;
    }

    if (!confirmationResult) {
      showNotification("Please request OTP first", "error");
      return;
    }

    setIsVerifying(true);
    try {
      await confirmationResult.confirm(otp);
      showNotification("OTP verified successfully!", "success");

      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.error("Error clearing recaptcha:", error);
        }
        window.recaptchaVerifier = null;
      }

      try {
        await handleSubmitPayLater();
      } catch (error) {
        await sendWhatsAppNotification(formData.order_customer_mobile);
        throw error;
      }
      setOtp("");
      setOtpSent(false);
      setConfirmationResult(null);
    } catch (error) {
      console.error("Error verifying OTP:", error);

      let errorMessage = "Invalid OTP. Please try again.";

      if (error.code == "auth/invalid-verification-code") {
        errorMessage = "Invalid OTP code";
      } else if (error.code == "auth/code-expired") {
        errorMessage = "OTP has expired. Please request a new one.";
      } else if (error.code == "auth/code-used") {
        errorMessage =
          "This OTP has already been used. Please request a new one.";
      }

      showNotification(errorMessage, "error");
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  const sendWhatsAppOtp = async () => {
    setVerificationMethod("whatsapp");
    if (!validateForm()) {
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/panel-create-web-booking-whatsapp-otp`,
        {
          order_customer_mobile: formData.order_customer_mobile,
        },
      );

      if (response.data.code === 200) {
        setOtpSent(true);
        showNotification("OTP sent to your WhatsApp number", "success");

        setResendTimer(10);
        resendIntervalRef.current = setInterval(() => {
          setResendTimer((prev) => {
            if (prev <= 1) {
              clearInterval(resendIntervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        throw new Error(response.data.msg || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending WhatsApp OTP:", error);
      showNotification(
        error.message || "Failed to send OTP. Please try again.",
        "error",
      );
      await sendWhatsAppNotification(formData.order_customer_mobile);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyWhatsAppOtp = async () => {
    if (!otp || otp.length !== 6) {
      showNotification("Please enter a valid 6-digit OTP", "error");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/panel-update-web-booking-whatsapp-otp`,
        {
          order_customer_mobile: formData.order_customer_mobile,
          otp_no: otp,
        },
      );

      if (response.data.code === 200) {
        showNotification("OTP verified successfully!", "success");
        await handleSubmitPayLater();
        setOtp("");
        setOtpSent(false);
      } else {
        showNotification(response.data.msg, "error");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      showNotification(
        error.message || "Invalid OTP. Please try again.",
        "error",
      );
      await sendWhatsAppNotification(formData.order_customer_mobile);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNoWhatsApp = async () => {
    setVerificationMethod("sms");
    try {
      await sendOtp();
    } catch (error) {
      console.error("Error sending SMS OTP:", error);
      await sendWhatsAppNotification(formData.order_customer_mobile);
      showNotification(
        "We got your query. We will get back to you soon.",
        "success",
      );
    }
  };

  const handleRemoveItem = (id) => {
    dispatch(removeFromCart(id));
  };

  const handleContinueShopping = () => {
    navigate("/service");
  };

  return (
    <>
      <DefaultHelmet />
      <style>
        {`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <div
        className={`fixed z-[1000] max-w-[300px] w-full ${
          isSmallScreen
            ? "top-[105px] left-1/2 transform -translate-x-1/2"
            : "top-[110px] right-5"
        }`}
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex justify-between items-center w-full rounded mb-2 p-2 text-sm shadow animate-[slideDown_0.3s_ease-out] ${
              notification.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            <span className="flex-1">{notification.message}</span>
            <button
              className="p-1 text-xs"
              onClick={() => removeNotification(notification.id)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="bg-gray-100 py-5 px-2 sm:px-4">
        <div className="container-fluid px-0">
          <div className="flex flex-col lg:flex-row gap-2">
            {/* Left Column - Booking Form */}
            <div className="w-full lg:w-8/12 xl:w-8/12">
              <div className="bg-white rounded-xl shadow-md overflow-hidden h-full">
                <div className="border-b border-gray-200 p-5">
                  <h1 className="text-lg font-semibold mb-0">
                    Booking Details
                  </h1>
                </div>

                <div className="p-3">
                  <form className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Customer Name{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="order_customer"
                            value={formData.order_customer}
                            onChange={handleInputChange}
                            placeholder="Your full name"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Mobile Number{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            name="order_customer_mobile"
                            value={formData.order_customer_mobile}
                            onChange={handleInputChange}
                            minLength={10}
                            maxLength={10}
                            placeholder="Your contact number"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            name="order_customer_email"
                            value={formData.order_customer_email}
                            onChange={handleInputChange}
                            placeholder="Your email address"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1 relative">
                          <label className="block text-sm font-medium text-gray-700">
                            Service Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            name="order_service_date"
                            value={formData.order_service_date}
                            onChange={handleInputChange}
                            required
                            disabled={isLoadingPrices}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          {isLoadingPrices && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              <div className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent text-blue-600 rounded-full" />
                            </div>
                          )}
                        </div>
                        {/* <div className="space-y-1 relative">
                          <label className="block text-sm font-medium text-gray-700">
                            Service Time <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="order_time"
                            value={formData.order_time}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                order_time: e.target.value,
                              })
                            }
                            required
                            disabled={timeLoading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select a time slot</option>
                            {timeSlot.map((slot, index) => (
                              <option key={index} value={slot.time_slot}>
                                {slot.time_slot}
                              </option>
                            ))}
                          </select>
                          {timeLoading && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              <div className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent text-blue-600 rounded-full" />
                            </div>
                          )}
                        </div> */}

<div className="space-y-1 relative">
  <label className="block text-sm font-medium text-gray-700">
    Service Time <span className="text-red-500">*</span>
  </label>

  <div className="relative">
    <input
      type="time"
      name="order_time"
      value={formData.order_time}
      onChange={(e) =>
        setFormData({
          ...formData,
          order_time: e.target.value,
        })
      }
      required
      disabled={timeLoading}
      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
    />

    {/* Clock Icon */}
    {/* <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" /> */}

    {/* Loading Spinner */}
    {timeLoading && (
      <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
        <div className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent text-blue-600 rounded-full" />
      </div>
    )}
  </div>
</div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          ref={autoCompleteRef}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search for your address..."
                          value={query}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Flat/Apartment
                          </label>
                          <input
                            type="text"
                            name="order_flat"
                            value={formData.order_flat}
                            onChange={handleInputChange}
                            placeholder="Flat number, building name, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Landmark
                          </label>
                          <input
                            type="text"
                            name="order_landmark"
                            value={formData.order_landmark}
                            onChange={handleInputChange}
                            placeholder="Nearby landmark"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Remarks
                        </label>
                        <textarea
                          name="order_remarks"
                          value={formData.order_remarks}
                          onChange={handleInputChange}
                          placeholder="Any special instructions or notes"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        ></textarea>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Column - Cart */}
            <div className="w-full lg:w-4/12 xl:w-4/12">
              <div className="sticky top-5 bottom-5">
                <div className="bg-white rounded-xl shadow-md overflow-hidden h-full">
                  <div className="border-b border-gray-200 p-5">
                    <div className="flex justify-between items-center">
                      <h1 className="text-lg font-semibold mb-0">Your Cart</h1>
                      {cartItems.length > 0 && (
                        <button
                          className="text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50"
                          onClick={() => dispatch(clearCart())}
                        >
                          Clear Cart
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    {cartItems.length === 0 ? (
                      <div className="text-center py-10 px-5">
                        <div className="text-4xl text-gray-400 mb-5">
                          <i className="ri-shopping-cart-2-line"></i>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                          Your cart is empty
                        </h3>
                        <p className="text-gray-600 mb-5">
                          Looks like you haven't added any services to your cart
                          yet.
                        </p>
                        <button
                          className="bg-black text-white px-5 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors"
                          onClick={handleContinueShopping}
                        >
                          Browse Services
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-center">
                          <h4 className="text-[17px]  font-semibold">
                            Order Summary
                          </h4>
                        </div>
                        {Object.entries(groupedItems).map(([key, group]) => (
                          <div
                            className="border border-gray-200 rounded-md overflow-hidden"
                            key={key}
                          >
                            <div className="space-y-2">
                              {group.items.map((item) => (
                                <div
                                  className="flex justify-between items-start p-3 border-b border-gray-100 last:border-0 gap-2"
                                  key={item.id}
                                >
                                  <div className="flex-1 min-w-0">
                                    <h5 className="text-[14px] font-medium text-gray-700 mb-1 leading-tight">
                                      {group.service_name} -{" "}
                                      {item.service_price_for}
                                    </h5>
                                    {group.service_sub_name && (
                                      <p className="text-xs text-gray-500 mb-1 leading-tight">
                                        {group.service_sub_name}
                                      </p>
                                    )}

                                    {(item.service_label === "Weekend" ||
                                      item.service_label === "Holiday") && (
                                      <span className="inline-block bg-yellow-500 text-black text-[0.65rem] px-2 py-1 rounded-md leading-none">
                                        {item.service_label} Price
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    {isLoadingPrices ? (
                                      <p className="text-xs text-gray-500 line-through relative min-h-[1em]">
                                        <span className="invisible">
                                          Original Price: ₹
                                          {item.service_price_rate}
                                        </span>
                                        <div className="absolute inset-0 flex justify-center">
                                          <div className="animate-spin inline-block w-3 h-3 border-[2px] border-current border-t-transparent text-blue-600 rounded-full" />
                                        </div>
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-500 line-through">
                                        ₹{item.service_price_rate}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-2">
                                      {isLoadingPrices ? (
                                        <span className="text-sm font-semibold text-green-600 relative min-h-[1em]">
                                          <span className="invisible">
                                            ₹{item.service_price_amount}
                                          </span>
                                          <div className="absolute inset-0 flex justify-center">
                                            <div className="animate-spin inline-block w-3 h-3 border-[2px] border-current border-t-transparent text-blue-600 rounded-full" />
                                          </div>
                                        </span>
                                      ) : (
                                        <span className="text-sm font-semibold text-green-600">
                                          ₹{item.service_price_amount}
                                        </span>
                                      )}
                                      <button
                                        className="text-red-600 hover:text-red-800 text-sm p-1 rounded hover:bg-red-50 disabled:opacity-60"
                                        onClick={() =>
                                          handleRemoveItem(item.id)
                                        }
                                        disabled={isLoadingPrices}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="border border-gray-200 rounded-md p-4">
                          <div className="space-y-2">
                            {totalOriginalPrice === 0 ? (
                              <div className="p-4 bg-emerald-50 rounded-md">
                                <span className="text-emerald-800 font-semibold text-sm">
                                  Your final price will be provided after the
                                  inspection.
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-end">
                                  <span className="text-sm font-medium text-gray-900">
                                    Total Amount
                                  </span>
                                  <div className="flex flex-col items-end">
                                    {totalOriginalPrice > 0 && (
                                      <span className="text-xs text-gray-500 line-through">
                                        ₹{totalOriginalPrice.toFixed(2)}
                                      </span>
                                    )}
                                    <span className="text-lg font-bold text-blue-600 leading-none">
                                      ₹{totalPrice.toFixed(2) || "0"}
                                    </span>
                                  </div>
                                </div>

                                {totalOriginalPrice - totalPrice > 0 && (
                                  <div className="flex justify-center">
                                    <div className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg text-xs">
                                      <span className="bg-green-600 text-white px-2 py-0.5 rounded font-semibold">
                                        {Math.round(
                                          (1 -
                                            totalPrice / totalOriginalPrice) *
                                            100,
                                        )}
                                        % OFF
                                      </span>
                                      <span className="text-green-600 font-medium">
                                        Congrats! 🎉 You Saved ₹
                                        {(
                                          totalOriginalPrice - totalPrice
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <div className="mt-5">
                            {totalOriginalPrice > 0 ? (
                              <>
                                {!otpSent ? (
                                  <button
                                    type="button"
                                    className={`w-full py-2 rounded-md font-medium transition-colors ${
                                      cartItems.length === 0 ||
                                      isLoadingPrices ||
                                      !formData.order_customer_mobile ||
                                      isSendingOtp
                                        ? "bg-gray-400 text-gray-800 cursor-not-allowed"
                                        : "bg-black text-white hover:bg-white hover:text-black hover:border hover:border-black"
                                    }`}
                                    // onClick={sendWhatsAppOtp}
                                    onClick={
                                      firebaseAvailable
                                        ? sendWhatsAppOtp
                                        : async () => {
                                            await sendWhatsAppNotification(
                                              formData.order_customer_mobile,
                                            );
                                            showNotification(
                                              "We got your query. We will get back to you soon.",
                                              "success",
                                            );
                                          }
                                    }
                                    disabled={
                                      cartItems.length === 0 ||
                                      isLoadingPrices ||
                                      !formData.order_customer_mobile ||
                                      isSendingOtp
                                    }
                                  >
                                    {/* {isSendingOtp ? (
                                      <>
                                        <span className="inline-block animate-spin rounded-md h-4 w-4 border-b-2 border-white mr-2"></span>
                                        Sending OTP...
                                      </>
                                    ) : (
                                      "Book Now"
                                    )} */}
                                    {isSendingOtp ? (
                                      <>
                                        <span className="inline-block animate-spin rounded-md h-4 w-4 border-b-2 border-white mr-2"></span>
                                        {firebaseAvailable
                                          ? "Sending OTP..."
                                          : "Processing..."}
                                      </>
                                    ) : firebaseAvailable ? (
                                      "Book Now"
                                    ) : (
                                      "Continue without verification"
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-full">
                                    <div className="text-sm  opacity-80">
                                      {verificationMethod === "whatsapp"
                                        ? "Whatsapp Verification"
                                        : "Sms Verification"}
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                      <OtpInput
                                        value={otp}
                                        onChange={setOtp}
                                        numInputs={6}
                                        inputType="tel"
                                        shouldAutoFocus
                                        renderInput={(props) => (
                                          <input {...props} />
                                        )}
                                        inputStyle={{
                                          width: "100%",
                                          height: "45px",
                                          margin: "0 2px",
                                          fontSize: "1rem",
                                          borderRadius: "4px",
                                          border: "1px solid #d1d5db",
                                          textAlign: "center",
                                        }}
                                        containerStyle={{
                                          justifyContent: "space-between",
                                          width: "100%",
                                        }}
                                      />
                                      <button
                                        className={`px-3 py-2 rounded-md font-medium text-sm ${
                                          isVerifying || otp.length !== 6
                                            ? "bg-gray-400 text-gray-800 cursor-not-allowed"
                                            : "bg-green-600 text-white hover:bg-green-700"
                                        }`}
                                        onClick={
                                          verificationMethod === "whatsapp"
                                            ? verifyWhatsAppOtp
                                            : verifyOtp
                                        }
                                        disabled={
                                          isVerifying || otp.length !== 6
                                        }
                                      >
                                        {isVerifying ? (
                                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></span>
                                        ) : null}
                                        Verify OTP
                                      </button>
                                    </div>
                                    <div className="text-center space-y-2">
                                      {resendTimer > 0 ? (
                                        <>
                                          <span className="text-gray-600 text-sm">
                                            Resend OTP in {resendTimer}s
                                          </span>
                                          {verificationMethod ===
                                            "whatsapp" && (
                                            <div className="text-sm">
                                              <button
                                                type="button"
                                                onClick={handleNoWhatsApp}
                                                className="text-gray-600 hover:text-gray-800 underline cursor-pointer"
                                              >
                                                I don't have WhatsApp
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            className={`text-blue-600 text-sm underline ${
                                              isVerifying
                                                ? "text-gray-400 cursor-not-allowed"
                                                : "hover:text-blue-800"
                                            }`}
                                            onClick={
                                              verificationMethod === "whatsapp"
                                                ? sendWhatsAppOtp
                                                : sendOtp
                                            }
                                            disabled={isVerifying}
                                          >
                                            {isSendingOtp ? (
                                              <>
                                                <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                                                Sending OTP...
                                              </>
                                            ) : (
                                              "Resend OTP"
                                            )}
                                          </button>
                                          {verificationMethod ===
                                            "whatsapp" && (
                                            <div className="text-sm">
                                              <button
                                                type="button"
                                                onClick={handleNoWhatsApp}
                                                className="text-gray-600 hover:text-gray-800 underline cursor-pointer"
                                              >
                                                I don't have WhatsApp
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                {!otpSent ? (
                                  <button
                                    type="button"
                                    className={`w-full py-3 rounded-md font-medium transition-colors ${
                                      cartItems.length === 0 ||
                                      isLoadingPrices ||
                                      isSendingOtp
                                        ? "bg-gray-400 text-gray-800 cursor-not-allowed"
                                        : "bg-black text-white hover:bg-white hover:text-black hover:border hover:border-black"
                                    }`}
                                    // onClick={sendWhatsAppOtp}
                                    onClick={
                                      firebaseAvailable
                                        ? sendWhatsAppOtp
                                        : async () => {
                                            await sendWhatsAppNotification(
                                              formData.order_customer_mobile,
                                            );
                                            showNotification(
                                              "We got your query. We will get back to you soon.",
                                              "success",
                                            );
                                          }
                                    }
                                    disabled={
                                      cartItems.length === 0 ||
                                      isLoadingPrices ||
                                      isSendingOtp
                                    }
                                  >
                                    {/* {isSendingOtp ? (
                                      <>
                                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                                        Sending OTP...
                                      </>
                                    ) : (
                                      "Book Inspection"
                                    )} */}
                                    {isSendingOtp ? (
                                      <>
                                        <span className="inline-block animate-spin rounded-md h-4 w-4 border-b-2 border-white mr-2"></span>
                                        {firebaseAvailable
                                          ? "Sending OTP..."
                                          : "Processing..."}
                                      </>
                                    ) : firebaseAvailable ? (
                                      "Book Inspection"
                                    ) : (
                                      "Continue without verification"
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-full">
                                    <div className="text-sm  opacity-80">
                                      {verificationMethod === "whatsapp"
                                        ? "Whatsapp Verification"
                                        : "Sms Verification"}
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                      <OtpInput
                                        value={otp}
                                        onChange={setOtp}
                                        numInputs={6}
                                        inputType="tel"
                                        shouldAutoFocus
                                        renderInput={(props) => (
                                          <input {...props} />
                                        )}
                                        inputStyle={{
                                          width: "100%",
                                          height: "45px",
                                          margin: "0 2px",
                                          fontSize: "1rem",
                                          borderRadius: "4px",
                                          border: "1px solid #d1d5db",
                                          textAlign: "center",
                                        }}
                                        containerStyle={{
                                          justifyContent: "space-between",
                                          width: "100%",
                                        }}
                                      />
                                      <button
                                        className={`px-3 py-2 rounded-md font-medium text-sm ${
                                          isVerifying || otp.length !== 6
                                            ? "bg-gray-400 text-gray-800 cursor-not-allowed"
                                            : "bg-green-600 text-white hover:bg-green-700"
                                        }`}
                                        onClick={
                                          verificationMethod === "whatsapp"
                                            ? verifyWhatsAppOtp
                                            : verifyOtp
                                        }
                                        disabled={
                                          isVerifying || otp.length !== 6
                                        }
                                      >
                                        {isVerifying ? (
                                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></span>
                                        ) : null}
                                        Verify OTP
                                      </button>
                                    </div>
                                    <div className="text-center space-y-2">
                                      {resendTimer > 0 ? (
                                        <>
                                          <span className="text-gray-600 text-sm">
                                            Resend OTP in {resendTimer}s
                                          </span>
                                          {verificationMethod ===
                                            "whatsapp" && (
                                            <div className="text-sm">
                                              <button
                                                type="button"
                                                onClick={handleNoWhatsApp}
                                                className="text-gray-600 hover:text-gray-800 underline cursor-pointer"
                                              >
                                                I don't have WhatsApp
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            className={`text-blue-600 text-sm underline ${
                                              isVerifying
                                                ? "text-gray-400 cursor-not-allowed"
                                                : "hover:text-blue-800"
                                            }`}
                                            onClick={
                                              verificationMethod === "whatsapp"
                                                ? sendWhatsAppOtp
                                                : sendOtp
                                            }
                                            disabled={isVerifying}
                                          >
                                            {isSendingOtp ? (
                                              <>
                                                <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                                                Sending OTP...
                                              </>
                                            ) : (
                                              "Resend OTP"
                                            )}
                                          </button>
                                          {verificationMethod ===
                                            "whatsapp" && (
                                            <div className="text-sm">
                                              <button
                                                type="button"
                                                onClick={handleNoWhatsApp}
                                                className="text-gray-600 hover:text-gray-800 underline cursor-pointer"
                                              >
                                                I don't have WhatsApp
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>{" "}
    </>
  );
};

export default Cart;

//changed
