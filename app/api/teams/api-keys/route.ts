import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Helper function to partially mask API key
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '***';
  return apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
}

// Helper function to encrypt API key
function encryptApiKey(apiKey: string): string {
  // In production, use a proper encryption key from environment variables
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Helper function to decrypt API key
function decryptApiKey(encryptedKey: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  
  const [ivHex, encrypted] = encryptedKey.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// GET /api/teams/api-keys - Get team API keys
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const includeDecrypted = searchParams.get('decrypt') === 'true';

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has permission to view API keys
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: teamId,
        p_permission: 'use_api_keys'
      });

    if (!permission && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get team API keys
    const { data: apiKeys, error } = await supabase
      .from('team_api_keys')
      .select(`
        id,
        name,
        api_key,
        api_provider,
        created_by,
        created_at,
        last_used_at,
        last_used_by,
        usage_count,
        usage_limit,
        expires_at,
        is_active,
        metadata,
        creator:profiles!team_api_keys_created_by_fkey(username, email)
      `)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    // Process API keys - decrypt or mask based on permission
    const processedKeys = apiKeys.map(key => {
      if (includeDecrypted && permission) {
        try {
          return {
            ...key,
            api_key: decryptApiKey(key.api_key),
            is_decrypted: true
          };
        } catch (error) {
          console.error('Error decrypting API key:', error);
          return {
            ...key,
            api_key: maskApiKey(key.api_key),
            is_decrypted: false
          };
        }
      } else {
        return {
          ...key,
          api_key: maskApiKey(key.api_key),
          is_decrypted: false
        };
      }
    });

    return NextResponse.json({ apiKeys: processedKeys });
  } catch (error) {
    console.error('Error in GET /api/teams/api-keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teams/api-keys - Add a new API key to a team
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, name, apiKey, apiProvider, usageLimit, expiresAt, metadata } = await request.json();

    if (!teamId || !name || !apiKey || !apiProvider) {
      return NextResponse.json({ 
        error: 'Team ID, name, API key, and provider are required' 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Super admins cannot add API keys to teams (they should not share their personal keys)
    if (profile.role === 'super_admin') {
      return NextResponse.json({ error: 'Super admins cannot add API keys to teams' }, { status: 403 });
    }

    // Check if user has permission to add API keys
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: teamId,
        p_permission: 'manage_api_keys'
      });

    if (!permission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Encrypt the API key before storing
    const encryptedKey = encryptApiKey(apiKey);

    // Add the API key
    const { data: newApiKey, error: insertError } = await supabase
      .from('team_api_keys')
      .insert({
        team_id: teamId,
        name,
        api_key: encryptedKey,
        api_provider: apiProvider,
        created_by: profile.id,
        usage_limit: usageLimit,
        expires_at: expiresAt,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'This API key already exists' }, { status: 400 });
      }
      console.error('Error adding API key:', insertError);
      return NextResponse.json({ error: 'Failed to add API key' }, { status: 500 });
    }

    return NextResponse.json({ 
      apiKey: {
        ...newApiKey,
        api_key: maskApiKey(apiKey) // Return masked version
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teams/api-keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/teams/api-keys - Update an API key
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKeyId, name, usageLimit, expiresAt, is_active, metadata } = await request.json();

    if (!apiKeyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the API key to update
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('team_api_keys')
      .select('team_id')
      .eq('id', apiKeyId)
      .single();

    if (apiKeyError || !apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Check if user has permission to manage API keys
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: apiKey.team_id,
        p_permission: 'manage_api_keys'
      });

    if (!permission && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the API key
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (usageLimit !== undefined) updateData.usage_limit = usageLimit;
    if (expiresAt !== undefined) updateData.expires_at = expiresAt;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: updatedApiKey, error: updateError } = await supabase
      .from('team_api_keys')
      .update(updateData)
      .eq('id', apiKeyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating API key:', updateError);
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }

    return NextResponse.json({ 
      apiKey: {
        ...updatedApiKey,
        api_key: maskApiKey(updatedApiKey.api_key)
      }
    });
  } catch (error) {
    console.error('Error in PATCH /api/teams/api-keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teams/api-keys - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const apiKeyId = searchParams.get('apiKeyId');

    if (!apiKeyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the API key to delete
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('team_api_keys')
      .select('team_id')
      .eq('id', apiKeyId)
      .single();

    if (apiKeyError || !apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Check if user has permission to manage API keys
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: apiKey.team_id,
        p_permission: 'manage_api_keys'
      });

    if (!permission && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete the API key
    const { error: deleteError } = await supabase
      .from('team_api_keys')
      .delete()
      .eq('id', apiKeyId);

    if (deleteError) {
      console.error('Error deleting API key:', deleteError);
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams/api-keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teams/api-keys/use - Record API key usage
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKeyId } = await request.json();

    if (!apiKeyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update usage statistics
    const { data: apiKey, error: updateError } = await supabase
      .from('team_api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        last_used_by: profile.id,
        usage_count: supabase.raw('usage_count + 1')
      })
      .eq('id', apiKeyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating API key usage:', updateError);
      return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 });
    }

    // Check if usage limit is exceeded
    if (apiKey.usage_limit && apiKey.usage_count >= apiKey.usage_limit) {
      // Deactivate the key if limit is reached
      await supabase
        .from('team_api_keys')
        .update({ is_active: false })
        .eq('id', apiKeyId);
      
      return NextResponse.json({ 
        warning: 'API key usage limit reached and has been deactivated',
        apiKey: {
          ...apiKey,
          api_key: maskApiKey(apiKey.api_key)
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      usage_count: apiKey.usage_count,
      usage_limit: apiKey.usage_limit
    });
  } catch (error) {
    console.error('Error in PUT /api/teams/api-keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
