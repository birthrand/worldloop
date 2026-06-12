import { useSignIn } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  const isSubmitting = fetchStatus === "fetching";

  const finalizeSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        router.replace(decorateUrl("/") as Href);
      },
    });
  };

  const handleSignIn = async () => {
    const { error } = await signIn.password({
      emailAddress: email.trim(),
      password,
    });

    if (error) return;

    if (signIn.status === "complete") {
      await finalizeSignIn();
      return;
    }

    if (signIn.status === "needs_client_trust") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (!sendError) setNeedsVerification(true);
    }
  };

  const handleVerifyCode = async () => {
    const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (error) return;

    if (signIn.status === "complete") {
      await finalizeSignIn();
    }
  };

  if (needsVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify your email</Text>
        <TextInput
          style={styles.input}
          placeholder="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoCapitalize="none"
        />
        {errors?.fields?.code ? (
          <Text style={styles.error}>{errors.fields.code.message}</Text>
        ) : null}
        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleVerifyCode}
          disabled={isSubmitting || code.trim().length === 0}
        >
          <Text style={styles.buttonText}>Verify</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors?.fields?.identifier ? (
        <Text style={styles.error}>{errors.fields.identifier.message}</Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      {errors?.fields?.password ? (
        <Text style={styles.error}>{errors.fields.password.message}</Text>
      ) : null}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isSubmitting || !email.trim() || !password}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>

      <Link href="/(auth)/sign-up">
        <Text style={styles.link}>Don&apos;t have an account? Sign up</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, gap: 12 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { color: "#0a7ea4", marginTop: 16 },
  error: { color: "#c00", fontSize: 14 },
});
