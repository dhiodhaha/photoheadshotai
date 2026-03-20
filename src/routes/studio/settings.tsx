import { createFileRoute } from '@tanstack/react-router';
import { motion } from 'motion/react';
import { Settings, User, Mail, Shield, Bell, Camera, Trash2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { cn } from '@/lib/utils';
// import { authClient } from '@/lib/auth-client'; // We'll uncomment when wiring up full backend
import { toast } from 'sonner';

export const Route = createFileRoute('/studio/settings')({
	component: SettingsPage,
});

const SETTINGS_TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Bell },
];

function SettingsPage() {
    // const { data: session } = authClient.useSession();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Your settings have been updated.');
        }, 1200);
    };

	return (
		<div className="relative min-h-[calc(100vh-5rem)] p-6 md:p-12 overflow-y-auto w-full">
            {/* Ambient background glow */}
			<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-30" />
			<div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] pointer-events-none opacity-20" />

			<div className="max-w-4xl mx-auto relative z-10 space-y-12">
                
                {/* Header Sequence */}
				<motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/10 text-[10px] font-bold tracking-widest uppercase mb-2 text-muted-foreground">
                        <Settings className="w-3 h-3 text-primary" />
                        Account Control
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight leading-none">
                        Configuration <span className="italic font-light text-muted-foreground">& Identity.</span>
                    </h1>
				</motion.div>

                <div className="flex flex-col md:flex-row gap-12">
                    {/* Sidebar Tabs */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="w-full md:w-64 shrink-0 space-y-2"
                    >
                        {SETTINGS_TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left",
                                        isActive 
                                            ? "bg-white/10 text-white shadow-lg shadow-black/20" 
                                            : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <tab.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                                    <span className="font-medium text-sm tracking-wide uppercase">{tab.label}</span>
                                </button>
                            );
                        })}
                    </motion.div>

                    {/* Content Area */}
                    <div className="flex-1">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="glass border border-white/10 rounded-3xl p-8"
                        >
                            {activeTab === 'profile' && (
                                <div className="space-y-8">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-display font-bold">Public Identity</h3>
                                        <p className="text-sm text-muted-foreground font-light">
                                            This is how you appear internally and on receipts.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="relative group cursor-pointer">
                                            <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-white/5 transition-colors group-hover:border-primary/50">
                                                <User className="w-10 h-10 text-muted-foreground group-hover:opacity-0 transition-opacity duration-300" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <Camera className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Button variant="outline" className="rounded-full border-white/10 text-xs tracking-widest uppercase font-bold px-6 h-10">
                                                Change Avatar
                                            </Button>
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">JPG or PNG. Max 5MB.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input 
                                                    defaultValue="Valued Member" 
                                                    className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary/50" 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input 
                                                    defaultValue="user@example.com" 
                                                    type="email" 
                                                    className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary/50" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button 
                                        onClick={handleSave} 
                                        disabled={isSaving}
                                        className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    >
                                        {isSaving ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-8">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-display font-bold">Account Security</h3>
                                        <p className="text-sm text-muted-foreground font-light">
                                            Protect your legacy and control your credentials.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Current Password</Label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input 
                                                    type="password" 
                                                    placeholder="••••••••" 
                                                    className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary/50" 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">New Password</Label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input 
                                                    type="password" 
                                                    placeholder="Enter new password" 
                                                    className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary/50" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button 
                                        className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs bg-white text-black hover:bg-white/90 transition-all active:scale-95"
                                    >
                                        Update Password
                                    </Button>

                                    <div className="w-full h-px bg-white/5 my-8" />

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold text-red-500 flex items-center gap-2">
                                                <Trash2 className="w-4 h-4" />
                                                Danger Zone
                                            </h4>
                                            <p className="text-xs text-muted-foreground line-clamp-2 pr-8">
                                                Once you delete your account, there is no going back. All generated photos, usage data, and credits will be permanently purged from our servers.
                                            </p>
                                        </div>
                                        <Button variant="outline" className="h-12 px-8 rounded-xl border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white uppercase tracking-widest text-xs font-bold transition-all">
                                            Delete Account
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'preferences' && (
                                <div className="space-y-8">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-display font-bold">Session & Preferences</h3>
                                        <p className="text-sm text-muted-foreground font-light">
                                            Manage your active session and platform settings.
                                        </p>
                                    </div>

                                    <div className="p-6 rounded-2xl glass border border-white/10 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold">Marketing Updates</h4>
                                            <p className="text-xs text-muted-foreground max-w-[200px] sm:max-w-none">Receive exclusive offers, feature announcements, and photography tips.</p>
                                        </div>
                                        <div className="w-12 h-6 rounded-full bg-primary relative cursor-pointer shadow-lg shadow-primary/20">
                                            <div className="absolute right-1 top-1 w-4 h-4 bg-primary-foreground rounded-full shadow-md" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
			</div>
		</div>
	);
}
