import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const POST = withAuth(async (req, user) => {
  //Generic logic for all users(Club + Customers)
  const { name, email, role, clubName, location } = await req.json();
  
  const { error } = await supabaseAdmin.from("users").insert({
    id: user.id,
    name,
    email,
    role,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  //Club Only logic
  if(role === "club"){
    const { error } = await supabaseAdmin.from("clubs").insert({
      id: user.id,
      club_name: clubName,
      club_email: email,
      address_text: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    if(error){
      return Response.json({error: error.message}, {status: 500});
    }
  }

  return Response.json({ ok: true });
});
