// Checkout form data types
export type CheckoutFormData = {
  // Customer information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Shipping address
  shippingAddress: {
    street: string;
    addressLine1?: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Delivery preferences
  deliveryMethod: 'pickup' | 'delivery';
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryInstructions?: string;

  // Payment information
  paymentMethod: 'cash' | 'stripe';

  // Additional information
  notes?: string;
  specialInstructions?: string;
  discountCode?: string;
};

// Payment method options
export type PaymentMethodOption = {
  label: string;
  value: 'cash' | 'stripe';
};

// Delivery method options
export type DeliveryMethodOption = {
  label: string;
  value: 'pickup' | 'delivery';
};

// Time slot options
export type TimeSlotOption = {
  label: string;
  value: string;
};

// Address option
export type AddressOption = {
  label: string;
  value: string;
};

// Checkout step types
export type CheckoutStep =
  | 'customer-info'
  | 'billing-address'
  | 'shipping-address'
  | 'delivery-options'
  | 'payment-method'
  | 'review-order'
  | 'confirmation';

// Checkout form props
export type CheckoutFormProps = {
  onSubmit: (data: CheckoutFormData) => void;
  isLoading: boolean;
  initialData?: Partial<CheckoutFormData>;
  onStepChange?: (step: CheckoutStep) => void;
  currentStep?: CheckoutStep;
};

// Payment processing types
export type PaymentProcessingState =
  | 'idle'
  | 'processing'
  | 'success'
  | 'error';

export type PaymentError = {
  code: string;
  message: string;
  field?: string;
};

// Order summary types
export type OrderSummary = {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
  farmCount: number;
};

// Delivery time slot types
export type DeliveryTimeSlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  available: boolean;
  maxOrders?: number;
  currentOrders?: number;
};

// Address validation types
export type AddressValidation = {
  isValid: boolean;
  errors: string[];
  suggestions?: string[];
};

// Form validation error types
export type FormValidationError = {
  field: string;
  message: string;
  code?: string;
};

// Checkout state types
export type CheckoutState = {
  currentStep: CheckoutStep;
  formData: Partial<CheckoutFormData>;
  validationErrors: FormValidationError[];
  paymentState: PaymentProcessingState;
  paymentError?: PaymentError;
  isSubmitting: boolean;
  orderId?: string;
};

// Checkout action types
export type CheckoutAction =
  | { type: 'SET_STEP'; payload: CheckoutStep }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<CheckoutFormData> }
  | { type: 'SET_VALIDATION_ERRORS'; payload: FormValidationError[] }
  | { type: 'SET_PAYMENT_STATE'; payload: PaymentProcessingState }
  | { type: 'SET_PAYMENT_ERROR'; payload: PaymentError }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ORDER_ID'; payload: string }
  | { type: 'RESET_CHECKOUT' };

// Checkout context types
export type CheckoutContextType = {
  state: CheckoutState;
  dispatch: React.Dispatch<CheckoutAction>;
  goToStep: (step: CheckoutStep) => void;
  updateFormData: (data: Partial<CheckoutFormData>) => void;
  validateStep: (step: CheckoutStep) => Promise<boolean>;
  submitOrder: () => Promise<void>;
  resetCheckout: () => void;
};
