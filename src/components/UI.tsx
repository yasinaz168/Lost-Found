import React from 'react';
import { View, Text, StyleSheet, TextInput, Image, ActivityIndicator, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: object;
  textColor?: string;
}

const buttonVariants: Record<ButtonVariant, object> = {
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.success },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },
};

const buttonSizes: Record<ButtonSize, object> = {
  sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, minHeight: 40 },
  md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, minHeight: 48 },
  lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, minHeight: 56 },
};

const textVariants: Record<ButtonVariant, object> = {
  primary: { color: Colors.textInverse },
  secondary: { color: Colors.textInverse },
  outline: { color: Colors.primary },
  ghost: { color: Colors.primary },
  danger: { color: Colors.textInverse },
};

const textSizes: Record<ButtonSize, object> = {
  sm: { fontSize: 14, fontWeight: '600' },
  md: { fontSize: 16, fontWeight: '600' },
  lg: { fontSize: 18, fontWeight: '600' },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textColor,
}) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        stylesButton.base,
        buttonSizes[size],
        buttonVariants[variant],
        fullWidth && stylesButton.fullWidth,
        pressed && !isDisabled && stylesButton.pressed,
        isDisabled && stylesButton.disabled,
        style,
      ]}
      android_ripple={{ color: Colors.primaryLight, borderless: false }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? Colors.textInverse : Colors.primary} />
      ) : (
        <View style={stylesButton.content}>
          {leftIcon && <View style={stylesButton.iconLeft}>{leftIcon}</View>}
          <Text style={[stylesButton.textBase, textSizes[size], textVariants[variant], textColor ? { color: textColor } : undefined]}>{title}</Text>
          {rightIcon && <View style={stylesButton.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};

const stylesButton = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ...Shadows.sm,
  },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5, ...Shadows.sm },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconLeft: { marginRight: Spacing.xs },
  iconRight: { marginLeft: Spacing.xs },
  textBase: { textAlign: 'center' },
});

export const Input: React.FC<{
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  style?: object;
}> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  rightIcon,
  disabled = false,
  style,
}) => {
  return (
    <View style={[stylesInput.container, style]}>
      {label && <Text style={stylesInput.label}>{label}</Text>}
      <View style={[
        stylesInput.inputWrapper,
        error && stylesInput.inputError,
        disabled && stylesInput.inputDisabled,
      ]}>
        {leftIcon && <View style={stylesInput.iconLeft}>{leftIcon}</View>}
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          style={[
            stylesInput.input,
            multiline && stylesInput.inputMultiline,
            leftIcon ? stylesInput.inputWithLeftIcon : undefined,
            rightIcon ? stylesInput.inputWithRightIcon : undefined,
          ]}
        />
        {rightIcon && <View style={stylesInput.iconRight}>{rightIcon}</View>}
      </View>
      {error && <Text style={stylesInput.errorText}>{error}</Text>}
    </View>
  );
};

const stylesInput = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '500' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputError: { borderColor: Colors.error },
  inputDisabled: { backgroundColor: Colors.surfaceVariant },
  input: {
    flex: 1,
    ...Typography.body1,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  inputMultiline: { paddingTop: Spacing.md, paddingBottom: Spacing.md, textAlignVertical: 'top' },
  inputWithLeftIcon: { paddingLeft: 0 },
  inputWithRightIcon: { paddingRight: 0 },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },
  errorText: { ...Typography.caption, color: Colors.error },
});

export const Card: React.FC<{
  children: React.ReactNode;
  style?: object;
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}> = ({ children, style, onPress, padding = 'md' }) => {
  const Component = onPress ? Pressable : View;
  const paddingStyle =
    padding === 'none' ? stylesCard.paddingNone :
    padding === 'sm' ? stylesCard.paddingSm :
    padding === 'md' ? stylesCard.paddingMd : stylesCard.paddingLg;
  return (
    <Component
      onPress={onPress}
      style={[
        stylesCard.card,
        paddingStyle,
        style,
      ]}
      android_ripple={onPress ? { color: Colors.primaryLight, borderless: false } : undefined}
    >
      {children}
    </Component>
  );
};

const stylesCard = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  paddingNone: {},
  paddingSm: { padding: Spacing.sm },
  paddingMd: { padding: Spacing.md },
  paddingLg: { padding: Spacing.lg },
});

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
  style?: object;
}> = ({ children, variant = 'primary', size = 'md', style }) => {
  const bgColors = {
    primary: Colors.primaryLight,
    success: Colors.successLight,
    warning: Colors.warningLight,
    error: Colors.errorLight,
    neutral: Colors.surfaceVariant,
  };
  const textColors = {
    primary: Colors.primary,
    success: Colors.success,
    warning: '#B45309',
    error: Colors.error,
    neutral: Colors.textSecondary,
  };

  return (
    <View
      style={[
        stylesBadge.badge,
        stylesBadge[size],
        { backgroundColor: bgColors[variant] },
        style,
      ]}
    >
      <Text style={[stylesBadge.text, stylesBadge[size], { color: textColors[variant] }]}>
        {children}
      </Text>
    </View>
  );
};

const stylesBadge = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sm: { paddingHorizontal: Spacing.sm, paddingVertical: 2, minHeight: 20 },
  md: { paddingHorizontal: Spacing.md, paddingVertical: 4, minHeight: 24 },
  text: { fontWeight: '600' },
});

export const Avatar: React.FC<{
  source?: { uri: string } | number;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  style?: object;
}> = ({ source, name, size = 'md', style }) => {
  const sizes = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
  const fontSizes = { xs: 10, sm: 12, md: 14, lg: 20, xl: 28 };
  const diameter = sizes[size];

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColor = (str: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
      '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  if (source) {
    return (
      <Image
        source={source}
        style={[{ width: diameter, height: diameter, borderRadius: diameter / 2 }, style]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        stylesAvatar.avatar,
        { width: diameter, height: diameter, backgroundColor: name ? getColor(name) : Colors.primary },
        style,
      ]}
    >
      {name && <Text style={[stylesAvatar.initials, { fontSize: fontSizes[size] }]}>{getInitials(name)}</Text>}
    </View>
  );
};

const stylesAvatar = StyleSheet.create({
  avatar: {
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: { color: Colors.textInverse, fontWeight: '600' },
});

export const Divider: React.FC<{ style?: object }> = ({ style }) => (
  <View style={[stylesDivider.divider, style]} />
);

const stylesDivider = StyleSheet.create({
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
});

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  style?: object;
}> = ({ icon, title, subtitle, action, style }) => (
  <View style={[stylesEmpty.container, style]}>
    <View style={stylesEmpty.iconWrapper}>{icon}</View>
    <Text style={stylesEmpty.title}>{title}</Text>
    {subtitle && <Text style={stylesEmpty.subtitle}>{subtitle}</Text>}
    {action && <Button title={action.label} onPress={action.onPress} variant="primary" size="md" />}
  </View>
);

const stylesEmpty = StyleSheet.create({
  container: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  iconWrapper: { padding: Spacing.lg, backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.full },
  title: { ...Typography.h3, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { ...Typography.body2, color: Colors.textSecondary, textAlign: 'center' },
});

export const Modal: React.FC<{
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  style?: object;
}> = ({ visible, onClose, children, title, style }) => {
  if (!visible) return null;

  return (
    <View style={stylesModal.overlay} onTouchStart={onClose} pointerEvents="box-none">
      <View style={[stylesModal.container, style]} pointerEvents="box-only">
        {title && (
          <View style={stylesModal.header}>
            <Text style={stylesModal.title}>{title}</Text>
            <Pressable onPress={onClose} style={stylesModal.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={stylesModal.closeText}>✕</Text>
            </Pressable>
          </View>
        )}
        <View style={stylesModal.content}>{children}</View>
      </View>
    </View>
  );
};

const stylesModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
    ...Shadows.lg,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h3, color: Colors.textPrimary },
  closeBtn: { padding: Spacing.xs },
  closeText: { fontSize: 24, color: Colors.textSecondary, fontWeight: '300' },
  content: { maxHeight: '70%' },
});

export const Header: React.FC<{
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  style?: object;
}> = ({ title, leftAction, rightAction, showBack = false, onBack, style }) => (
  <View style={[stylesHeader.header, style]}>
    <View style={stylesHeader.left}>
      {showBack && (
        <Pressable onPress={onBack} style={stylesHeader.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={stylesHeader.backText}>←</Text>
        </Pressable>
      )}
      {leftAction}
    </View>
    <Text style={stylesHeader.title}>{title}</Text>
    <View style={[stylesHeader.right, { width: showBack ? 40 : undefined }]}>{rightAction}</View>
  </View>
);

const stylesHeader = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  right: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.sm },
  title: { ...Typography.h4, color: Colors.textPrimary, textAlign: 'center', flex: 1 },
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: 20, color: Colors.textPrimary, fontWeight: '300' },
});

export const SectionHeader: React.FC<{
  title: string;
  action?: { label: string; onPress: () => void };
  style?: object;
}> = ({ title, action, style }) => (
  <View style={[stylesSection.container, style]}>
    <Text style={stylesSection.title}>{title}</Text>
    {action && (
      <Pressable onPress={action.onPress}>
        <Text style={stylesSection.actionText}>{action.label}</Text>
      </Pressable>
    )}
  </View>
);

const stylesSection = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h3, color: Colors.textPrimary },
  actionText: { ...Typography.body2, color: Colors.primary, fontWeight: '600' },
});
