
<!DOCTYPE html>
<html lang="en">
<?php include "head.php";?>

<body class="g-sidenav-show  bg-gray-100">
    <?php include "navbar.php";?>
    <!-- End Navbar -->
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <div class="card mb-4">
            <div class="card-header pb-0">
              <center><h6>Detail Approv Pinjaman Baru </h6></center>
            </div>
            <div class="card-body px-0 pt-0 pb-2">
              <div class="table-responsive p-0">
                <table class="table align-items-center mb-0">
                  <thead>
                    <tr>
                      <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">Keterangan</th>
                      <th class="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php foreach($tbl_data as $d){ ?>
                    <tr>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">ID Nasabah</h6>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm"><?php echo $d['NASABAH_ID'];?></h6>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">NO REKENING | KOLEK</h6>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm"><?php echo $d['NO_REKENING']." | ".$d['KOLEKTIBILITAS'] ;?></h6>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                    <tr>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">NAMA NASABAH</h6>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm"><?php echo $d['NAMA_NASABAH'];?></h6>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">Alamat</h6>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm"><?php echo $d['alamat'];?></h6>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">JENIS PINAJAMAN</h6>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm"><?php echo $d['DESKRIPSI_JENIS_KREDIT'];?></h6>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">TGL REGISTRASI | TGL JATUH TEMPO  </h6>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm"><?php echo $d['TGL_REALISASI']." | ".$d['TGL_JATUH_TEMPO'];?></h6>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">SUKU BUNGA | JKW | JML ANGSURAN  </h6>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm"><?php echo $d['BI_SUKU_BUNGA']." | ".$d['BI_JANGKA_WAKTU']." Bulan | Rp.".number_format($d['ANGSURAN_TOTAL'],0,",",".");?></h6>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm">JML PINJAMAN | JML MARGIN </h6>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex px-2 py-1">
                          <div class="d-flex flex-column justify-content-center">
                            <h6 class="mb-0 text-sm"><?php echo "Rp. ".number_format($d['JML_PINJAMAN'],0,",",".")." | Rp.".number_format($d['JML_BUNGA_PINJAMAN'],0,",",".");?></h6>
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="col-2">
        </div>
        <div class="col-8">
          <div class="card mb-4">
            <div class="card-header pb-0">
             <center> <h6>Action Approv </h6></center>
            </div>
            <div class="card-body px-0 pt-0 pb-2">
              <div class="table-responsive p-0">
                <table class="table align-items-center mb-0">
                  <tbody>
                    <tr>
                      <td>
                        <div class="ms-auto text-center ">
                            <a class="btn btn-link text-success px-3 mb-0" href="<?php echo base_url()?>Approv_con/approv_all/<?php echo $this->uri->segment(3);?>/<?php echo trim($d['NO_REKENING'])?>/1">
                                <i class="fas fa-pencil-alt text-success me-2" aria-hidden="true"></i>Terima</a>
                            <a class="btn btn-link text-danger text-gradient px-3 mb-0" href="<?php echo base_url()?>Approv_con/approv_all/<?php echo $this->uri->segment(3);?>/<?php echo trim($d['NO_REKENING'])?>/0">
                                <i class="far fa-trash-alt me-2"></i>Tolak</a>
                        </div>
                      </td>
                    </tr>
                    <?php } ?>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <?php include "footer.php";?>
    </div>
  </main>
  <?php include "js.php";?>
</body>

</html>