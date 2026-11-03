import type React from "react";
import { useState } from "react";
import { Button, Field, Flex, Form, Heading, Input, Text } from "@/components/ui";
import Logo from "@/components/layout/Logo/Logo";
import { APP_TITLE } from "@/constants/app";
import { useLogin } from "@/lib/auth";
import styles from "./Login.module.scss";

const LoginUI: React.FC = () => {
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    // Success sets the session; LoginPage then redirects.
    try {
      await login.mutateAsync({ username, password });
    } catch (loginError) {
      setError((loginError as Error).message);
      setPassword("");
    }
  };

  return (
    <div className={styles.login}>
      <Flex direction="column" align="center" gap="6" className={styles.login_inner}>
        <Logo />
        <div className={styles.login_card}>
          <Flex direction="column" gap="1" mb="5">
            <Heading as="h1" size="4">
              Log in
            </Heading>
            <Text size="2" color="gray">
              {`${APP_TITLE} is private: use the shared login.`}
            </Text>
          </Flex>
          <Form onSubmit={onSubmit} error={error}>
            <Field label="Username">
              <Input
                name="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Logging in…" : "Log in"}
            </Button>
          </Form>
        </div>
      </Flex>
    </div>
  );
};

export default LoginUI;
