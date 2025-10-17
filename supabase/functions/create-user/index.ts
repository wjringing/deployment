import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: string;
  selectedLocations: string[];
  primaryLocation: string | null;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create regular client to verify the caller's permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify caller is super_admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      throw new Error('Unauthorized: Only super admins can create users');
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();

    // Validate required fields
    if (!body.email || !body.password || !body.full_name || !body.role) {
      throw new Error('Missing required fields');
    }

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
        phone: body.phone,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned');
    }

    // Create user profile
    const { error: profileInsertError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone,
        role: body.role,
        status: 'active',
      });

    if (profileInsertError) {
      console.error('Profile error:', profileInsertError);
      // Try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create user profile: ${profileInsertError.message}`);
    }

    // If not super_admin, create location access records
    if (body.role !== 'super_admin' && body.selectedLocations && body.selectedLocations.length > 0) {
      const locationAccess = body.selectedLocations.map((locId) => ({
        user_id: authData.user.id,
        location_id: locId,
        role: body.role,
        is_primary: locId === body.primaryLocation,
      }));

      const { error: accessError } = await supabaseAdmin
        .from('user_location_access')
        .insert(locationAccess);

      if (accessError) {
        console.error('Location access error:', accessError);
        // Try to clean up
        await supabaseAdmin.from('user_profiles').delete().eq('id', authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create location access: ${accessError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: body.email,
          full_name: body.full_name,
          role: body.role,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: error.message?.includes('Unauthorized') ? 403 : 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
