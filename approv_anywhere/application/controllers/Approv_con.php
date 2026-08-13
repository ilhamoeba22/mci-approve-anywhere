<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Approv_con extends CI_Controller {
	function __construct(){
        parent:: __construct();
        $this->load->database();
        $this->load->helper('url_helper');
        $this->load->library('session');
        $this->load->model('M_crud');
		
	}
    
    public function index()
    {
        $head 	        ="Approv Anywhere";
		$session_data   = $this->session->userdata('data_session');
		$user           = $session_data['user'];
		$jabatan        = $session_data['jabatan'];
        $CI             = &get_instance();
        $this->db2      = $CI->load->database('cek_data', TRUE);
        date_default_timezone_set("Asia/Jakarta");
        $today          = date("Y/m/d");
		$nama_otori     = $user;
		$tbl_data = $this->M_crud->query("SELECT * from dbo.USERPROFILE");
        if($nama_otori == "FIAN" or $nama_otori == "BONBON"){
            $tbl_hist = $this->M_crud->query_2("SELECT * from otorisasi where DATE(waktu_minta) = '$today'
            order by waktu_minta DESC");
        }else{
            $tbl_hist = $this->M_crud->query_2("SELECT * from otorisasi where username_otor='$nama_otori' AND DATE(waktu_minta) = '$today'
            order by waktu_minta DESC");
        }
        
        $tbl_dash = $this->M_crud->query_2("SELECT count(id) as cn_all, count(distinct(username_minta)) as cn_user, COUNT(IF(status_otor='TERIMA',1, NULL))as cn_sukses,
                    COUNT(IF(status_otor='TOLAK',1, NULL))AS cn_failed from otorisasi where DATE(waktu_minta) = '$today'");
		$this->load->view('t_approve', array('tbl_dash'=>$tbl_dash, 'tbl_hist'=>$tbl_hist, 'tbl_data'=>$tbl_data, 'head' => $head,));
    }

    public function det_app()
    {
        $head 	        ="Detail Approv Anywhere";
        $id             = $this->uri->segment(3);
        $CI             = &get_instance();
        $this->db2      = $CI->load->database('cek_data', TRUE);
        date_default_timezone_set("Asia/Jakarta");
        $today          = date("y-m-d");
		$tbl_data = $this->M_crud->query_2("SELECT * from otorisasi where id='$id' and status_otor='TUNGGU'");
		$this->load->view('t_det_approv', array( 'tbl_data'=>$tbl_data, 'head' => $head,));
    }

    public function profil()
    {
        $head 	        ="Profil Approv Anywhere";
        $session_data   = $this->session->userdata('data_session');
		$user           = $session_data['user'];
        $CI             = &get_instance();
        $this->db2      = $CI->load->database('cek_data', TRUE);
        date_default_timezone_set("Asia/Jakarta");
        $today          = date("y-m-d");
		$tbl_data = $this->M_crud->query_2("SELECT * from passwd where USERNAME='$user' ");
		$this->load->view('t_profil', array( 'tbl_data'=>$tbl_data, 'head' => $head,));
    }

    public function otori_app()
    {
        $detail = $_SERVER['HTTP_USER_AGENT'];
        $split  = explode(";",$detail);
        $det    = explode(")",$split[2]);
        $det1   = "From ".trim($det[0]).", ".trim($split[1]).", ".str_replace(" ","",str_replace("(",", ",$split[0]));
        $id 		= $this->uri->segment(3);
        $ket 		= $this->uri->segment(4);
        $data = array(
            'status_otor'           => $ket,
            'from_web'              => $det1,
        );
        $where = array('id' => $id);
		$this->M_crud->edit_2($where,'otorisasi',$data);
        $this->session->set_flashdata('success', 'Data Berhasil Diedit');
		redirect('/Approv_con');       
    }

    public function confirm()
    {
        $head 	        ="Approv Anywhere";
		$session_data   = $this->session->userdata('data_session');
        $userid         = $session_data['userid'];
		$user           = $session_data['user'];
		$jabatan        = $session_data['jabatan'];
        $limit_approval = $session_data['limit_approval'];

        $CI             = &get_instance();
        $this->db2      = $CI->load->database('cek_data', TRUE);
        date_default_timezone_set("Asia/Jakarta");
        $today          = date("Y/m/d");
		$nama_otori     = $user;
        $jenis          = $this->uri->segment(3);
        $tbl_d1 = $this->M_crud->query_2("SELECT COUNT(IF(status_approval='0',1, NULL))AS cn_nas FROM nasabah");
        $tbl_d2 = $this->M_crud->query_2("SELECT COUNT(IF(STATUS_APPROVAL='0',1, NULL))AS cn_tab FROM tabung");
        $tbl_d3 = $this->M_crud->query_2("SELECT COUNT(IF(STATUS_APPROVAL='0',1, NULL))AS cn_dep FROM deposito");
        $tbl_d4 = $this->M_crud->query_2("SELECT COUNT(IF(STATUS_APPROVAL='0',1, NULL))AS cn_kre FROM kredit");

        if($jenis == "Nas"){
            $judul 	        ="Nasabah Baru Approv Anywhere";
            $tbl_data = $this->M_crud->query_2("SELECT * from nasabah where  status_approval='0' order by nasabah_id DESC");
            $this->load->view('t_nas_new', array('tbl_d1'=>$tbl_d1, 'tbl_d2'=>$tbl_d2, 'tbl_d3'=>$tbl_d3, 'tbl_d4'=>$tbl_d4, 
            'tbl_data'=>$tbl_data, 'head' => $head,'judul' => $judul, ));
        }elseif($jenis == "Tab"){
            $judul 	        ="Tabungan Baru Approv Anywhere";
            $tbl_data = $this->M_crud->query_2("SELECT tabung.*, NAMA_NASABAH, DESKRIPSI_JENIS_TABUNGAN from tabung 
            inner join nasabah on tabung.NASABAH_ID = nasabah.nasabah_id
            inner join kodejenistabungan on tabung.JENIS_TABUNGAN = kodejenistabungan.KODE_JENIS_TABUNGAN
            where  tabung.STATUS_APPROVAL='0' order by NASABAH_ID DESC");
            $this->load->view('t_nas_new', array('tbl_d1'=>$tbl_d1, 'tbl_d2'=>$tbl_d2, 'tbl_d3'=>$tbl_d3, 'tbl_d4'=>$tbl_d4, 
            'tbl_data'=>$tbl_data, 'head' => $head,'judul' => $judul, ));
        }elseif($jenis == "Dep"){
            $judul 	        ="Deposito Baru Approv Anywhere";
            $tbl_data = $this->M_crud->query_2("SELECT deposito.*, NAMA_NASABAH, DESKRIPSI_JENIS_DEPOSITO  from deposito 
            inner join nasabah on deposito.NASABAH_ID = nasabah.nasabah_id
            inner join kodejenisdeposito on deposito.JENIS_DEPOSITO = kodejenisdeposito.KODE_JENIS_DEPOSITO
            where  deposito.STATUS_APPROVAL='0' and JML_DEPOSITO <= '$limit_approval' order by NASABAH_ID DESC");
            $this->load->view('t_nas_new', array('tbl_d1'=>$tbl_d1, 'tbl_d2'=>$tbl_d2, 'tbl_d3'=>$tbl_d3, 'tbl_d4'=>$tbl_d4, 
            'tbl_data'=>$tbl_data, 'head' => $head,'judul' => $judul, ));
        }elseif($jenis == "Kre"){
            $judul 	        ="Pembiayaan Baru Approv Anywhere";
            $tbl_data = $this->M_crud->query_2("SELECT kredit.*, NAMA_NASABAH, DESKRIPSI_JENIS_KREDIT  from kredit 
            inner join nasabah on kredit.NASABAH_ID = nasabah.nasabah_id
            inner join kodejeniskredit on kredit.JENIS_PINJAMAN = kodejeniskredit.KODE_JENIS_KREDIT
            where  kredit.STATUS_APPROVAL='0' and JML_PINJAMAN <= '$limit_approval' order by NASABAH_ID DESC");
            $this->load->view('t_nas_new', array('tbl_d1'=>$tbl_d1, 'tbl_d2'=>$tbl_d2, 'tbl_d3'=>$tbl_d3, 'tbl_d4'=>$tbl_d4, 
            'tbl_data'=>$tbl_data, 'head' => $head,'judul' => $judul, ));
        }
    }

    public function det_nas()
    {
        $head 	        ="Approv Anywhere";
        $jenis          = $this->uri->segment(3);
        $id             = $this->uri->segment(4);
        $CI             = &get_instance();
        $this->db2      = $CI->load->database('cek_data', TRUE);
        date_default_timezone_set("Asia/Jakarta");
        $today          = date("y-m-d");
        if($jenis == "Nas"){
            $tbl_data = $this->M_crud->query_2("SELECT * from nasabah where nasabah_id='$id'");
            $this->load->view('t_det_nas', array( 'tbl_data'=>$tbl_data, 'head' => $head,));
        }elseif($jenis == "Tab"){
            $tbl_data = $this->M_crud->query_2("SELECT tabung.*, NAMA_NASABAH, DESKRIPSI_JENIS_TABUNGAN, alamat from tabung 
            inner join nasabah on tabung.NASABAH_ID = nasabah.nasabah_id
            inner join kodejenistabungan on tabung.JENIS_TABUNGAN = kodejenistabungan.KODE_JENIS_TABUNGAN
            where  tabung.NO_REKENING='$id' order by NASABAH_ID DESC");
            $this->load->view('t_det_tab', array( 'tbl_data'=>$tbl_data, 'head' => $head,));
        }elseif($jenis == "Dep"){
            $tbl_data = $this->M_crud->query_2("SELECT deposito.*, NAMA_NASABAH, DESKRIPSI_JENIS_DEPOSITO, alamat  from deposito 
            inner join nasabah on deposito.NASABAH_ID = nasabah.nasabah_id
            inner join kodejenisdeposito on deposito.JENIS_DEPOSITO = kodejenisdeposito.KODE_JENIS_DEPOSITO
            where  deposito.NO_REKENING='$id' order by NASABAH_ID DESC");
            $this->load->view('t_det_dep', array( 'tbl_data'=>$tbl_data, 'head' => $head,));
        }elseif($jenis == "Kre"){
            $tbl_data = $this->M_crud->query_2("SELECT kredit.*, NAMA_NASABAH, DESKRIPSI_JENIS_KREDIT, alamat  from kredit 
            inner join nasabah on kredit.NASABAH_ID = nasabah.nasabah_id
            inner join kodejeniskredit on kredit.JENIS_PINJAMAN = kodejeniskredit.KODE_JENIS_KREDIT
            where  kredit.NO_REKENING='$id' order by NASABAH_ID DESC");
            $this->load->view('t_det_kre', array( 'tbl_data'=>$tbl_data, 'head' => $head,));
        }
		
    }

    public function approv_all()
    {
        $session_data   = $this->session->userdata('data_session');
        $userid         = $session_data['userid'];
		$user           = $session_data['user'];
        $jenis   		= $this->uri->segment(3);
        $id 	    	= $this->uri->segment(4);
        $ket 		    = $this->uri->segment(5);
        if($jenis == "Nas"){
            $data = array(
                'status_approval'         => $ket,
                'user_approval'           => $userid,
            );
            $where = array('nasabah_id' => $id);
            $this->M_crud->edit_2($where,'nasabah',$data);
            $this->session->set_flashdata('success', 'Data Berhasil Diedit');
            redirect('/Approv_con/confirm/Nas'); 
        }elseif($jenis == "Tab"){
            $data = array(
                'STATUS_APPROVAL'         => $ket,
                'user_approval'           => $userid,
            );
            $where = array('NO_REKENING' => $id);
            $this->M_crud->edit_2($where,'tabung',$data);
            $this->session->set_flashdata('success', 'Data Berhasil Diedit');
            redirect('/Approv_con/confirm/Tab'); 
        }elseif($jenis == "Dep"){
            $data = array(
                'STATUS_APPROVAL'         => $ket,
                'user_approval'           => $userid,
            );
            $where = array('NO_REKENING' => $id);
            $this->M_crud->edit_2($where,'deposito',$data);
            $this->session->set_flashdata('success', 'Data Berhasil Diedit');
            redirect('/Approv_con/confirm/Dep'); 
        }elseif($jenis == "Kre"){
            $data = array(
                'STATUS_APPROVAL'         => $ket,
                'user_approval'           => $userid,
            );
            $where = array('NO_REKENING' => $id);
            $this->M_crud->edit_2($where,'kredit',$data);
            $this->session->set_flashdata('success', 'Data Berhasil Diedit');
            redirect('/Approv_con/confirm/Kre'); 
        }
        
              
    }

    public function edit_status()
    {
        $id = "0";
        $data = array(
            'STATUS_USER'           => '0',
        );
        $where = array('userid !=' => $id);
		$this->M_crud->edit_2($where,'passwd',$data);
        
        $this->session->set_flashdata('success', 'Status Berhasil ');
		redirect('/Approv_con');       
    }
}
?>