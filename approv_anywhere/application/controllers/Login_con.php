<?php defined('BASEPATH') OR exit('No direct script access allowed');

class Login_con extends CI_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->library('session');
        $this->load->model('M_crud');
        
    }

    public function index(){
        $head 	="Login Approv Anywhere";
		$this->load->view('login', array('head' => $head));
    }

    public function nama_ao(){
        $head 	="Login Approv Anywhere";
        $tbl_data = $this->M_crud->query("SELECT * from dbo.USERPROFILE");
        $this->load->view('t_approve', array( 'tbl_data'=>$tbl_data, 'head' => $head,));
    }

    public function cek() {

        $user 			= $_POST['user'];
        $pass 			= $_POST['pass']; 
        $CI             = &get_instance();
        $this->db2      = $CI->load->database('cek_data', TRUE);
        $sql = $this->db2->query('SELECT * from passwd where USERNAME = "'.$user.'" and user_blokir = 0');
        $cek_user = $sql->num_rows();
        if ($cek_user > 0) {
            $id_db          = $sql->row('userid');
            $pass_db        = $sql->row('PASSWORD');
            $user_db        = $sql->row('USERNAME');
            $nama_db        = $sql->row('namalengkap');
            $jabatan_db     = $sql->row('USERGROUP');
            $device_db      = $sql->row('nama_komputer');
            $lim_approv_db  = $sql->row('limit_approval');
            $waktu          = time();
            $pw = $this->M_crud->MyEncrypt($pass);
            if ((trim($pass_db) == $this->M_crud->MyEncrypt($pass)) or ((trim($pass_db) == $this->M_crud->MyEncrypt(strtoupper($pass)))))
            {
                session_start();
                $data_session = array(
                    'userid'            => $id_db, 
                    'user'              => $user_db,                
                    'nama'              => $nama_db,
                    'jabatan'           => $jabatan_db,
                    'device'            => $device_db,
                    'last_login_time'   => $waktu,
                    'limit_approval'    => $lim_approv_db,
                );
                $this->session->set_userdata('data_session',$data_session);
                $this->session->set_flashdata('success', 'Selesai Login');
                redirect(site_url('Approv_con/'));
            }else{
                $this->session->set_flashdata('warning', "'Maaf, User atau password salah.. USER ='$user' DAN PASS='$pw'");
                redirect("Login_con/");
            }
            
        }else{
            $this->session->set_flashdata('warning', 'User tidak terdaftar');
            redirect("Login_con/");
        }
		
    }

    public function logout(){
        session_start();
        $session_data = $this->session->userdata('data_session');
        $user = $session_data['user'];
        session_destroy();
        redirect("Login_con/");   
    }

}
?>