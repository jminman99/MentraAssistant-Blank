import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Heart, Mountain } from "lucide-react";
import { SiGoogle, SiFacebook, SiX, SiApple } from "react-icons/si";

export default function Login() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    subscriptionPlan: "individual",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync(loginData);
      toast({
        title: "Success",
        description: "Welcome back to Mentra!",
      });
      // Navigate to dashboard after successful login
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    try {
      await register.mutateAsync(registerData);
      toast({
        title: "Success",
        description: "Welcome to Mentra! Your account has been created.",
      });
      // Navigate to dashboard after successful registration
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg border border-slate-300">
                <div className="text-white font-bold text-xl">M</div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Mentra</h1>
          </div>
          <p className="text-slate-600">Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all.</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>
                  Sign in to continue your journey of wisdom and guidance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* SSO Buttons */}
                <div className="space-y-3 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 h-11"
                    onClick={() => window.location.href = '/api/auth/google'}
                  >
                    <SiGoogle className="w-4 h-4 text-blue-600" />
                    <span>Continue with Google</span>
                  </Button>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center h-11"
                      onClick={() => window.location.href = '/api/auth/facebook'}
                    >
                      <SiFacebook className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center h-11"
                      onClick={() => window.location.href = '/api/auth/twitter'}
                    >
                      <SiX className="w-4 h-4 text-black" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center h-11"
                      onClick={() => window.location.href = '/api/auth/apple'}
                    >
                      <SiApple className="w-4 h-4 text-black" />
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white border-0 shadow-lg transition-all duration-200 transform hover:scale-[1.02]" disabled={login.isPending}>
                    {login.isPending ? "Signing in..." : "Enter Mentra"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create your account</CardTitle>
                <CardDescription>
                  Join thousands finding wisdom and guidance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* SSO Buttons for Registration */}
                <div className="space-y-3 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 h-11"
                    onClick={() => window.location.href = '/api/auth/google'}
                  >
                    <SiGoogle className="w-4 h-4 text-blue-600" />
                    <span>Continue with Google</span>
                  </Button>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center h-11"
                      onClick={() => window.location.href = '/api/auth/facebook'}
                    >
                      <SiFacebook className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center h-11"
                      onClick={() => window.location.href = '/api/auth/twitter'}
                    >
                      <SiX className="w-4 h-4 text-black" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center h-11"
                      onClick={() => window.location.href = '/api/auth/apple'}
                    >
                      <SiApple className="w-4 h-4 text-black" />
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or create account with email</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={registerData.firstName}
                        onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={registerData.lastName}
                        onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  {/* All users now get full access to all features */}
                  <Button type="submit" className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white border-0 shadow-lg transition-all duration-200 transform hover:scale-[1.02]" disabled={register.isPending}>
                    {register.isPending ? "Creating account..." : "Begin Your Journey"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
