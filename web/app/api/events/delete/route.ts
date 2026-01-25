import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const DELETE = withAuth(async (req: Request, user: {id: string})=> {
    try{
      const {searchParams} = new URL(req.url);
      const eventId = searchParams.get("eventId");
      const {error} = await supabaseAdmin.from("event_ticket_pricing")
      .delete()
      .eq("event_id", eventId);
      if(error){
        console.error(error.message);
        return Response.json({error: error.message}, {status: 500});
      }
      const {error: error1} = await supabaseAdmin.from("events")
      .delete()
      .eq("id", eventId);
      if(error1){
        console.error(error1.message);
        return Response.json({error: error1.message}, {status: 500});
      }
      return Response.json({success: true}, {status: 200});

    }catch(err){
        console.error(err);
        return Response.json({error: err}, {status: 500});
    }
})