<?php 

class M_crud extends CI_Model{
	//select
	

	function data(){
		return $this->db->get("tbl_data");
	}
	public function get($where=""){
		$data = $this->db->query("SELECT * FROM ".$where);
		return $data->result_array();
	}
	public function query($query){
		$data = $this->db->query($query);
		return $data->result_array();
	}
	public function query_2($query){
		$CI             = &get_instance();
		$this->db2      = $CI->load->database('cek_data', TRUE);
		$data = $this->db2->query($query);
		return $data->result_array();
	}
	//add
	function tambah($data,$table){
		$this->db->insert($table,$data);
	}

	//hapus
	function hapus($where,$table){
		$this->db->where($where);
		$this->db->delete($table);
	}

	function edit($where,$table,$data){
		$this->db->where($where);
		$this->db->update($table,$data);
	}

	function edit_2($where,$table,$data){
		$CI             = &get_instance();
        $this->db2      = $CI->load->database('cek_data', TRUE);
		$this->db2->where($where);
		$this->db2->update($table,$data);
	}

	function MyEncrypt($Cpass)
	{
		$Cpasshasil = "";
		$Cpass = trim($Cpass);
		for ($I = 0; $I < strlen($Cpass); $I++) {
			$Cpasshasil = $Cpasshasil . chr(ord(substr($Cpass, $I, 1)) + 5);
		}
		return $Cpasshasil;
	}

}