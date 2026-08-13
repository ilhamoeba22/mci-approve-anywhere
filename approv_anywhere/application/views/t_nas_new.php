
<!DOCTYPE html>
<html lang="en">
<?php include "head.php";?>

<body class="g-sidenav-show  bg-gray-100">
    <?php include "navbar.php";?>
    <!-- End Navbar -->
    <div class="container-fluid py-1">
      <div class="row">
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <a href="<?php echo base_url()."Approv_con/confirm/Nas" ?>">
            <div class="card">
              <div class="card-body p-3">
                <div class="row">
                  <div class="col-8">
                    <div class="numbers">
                      <p class="text-sm mb-0 text-capitalize font-weight-bold">Nasabah Baru</p>
                    </div>
                  </div>
                  <div class="col-4 text-end">
                    <div class="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                      <i class="ni ni-user text-lg opacity-10" aria-hidden="true"><?php echo $tbl_d1[0]['cn_nas']; ?></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <a href="<?php echo base_url()."Approv_con/confirm/Tab" ?>">
            <div class="card">
              <div class="card-body p-3">
                <div class="row">
                  <div class="col-8">
                    <div class="numbers">
                      <p class="text-sm mb-0 text-capitalize font-weight-bold">Tabungan Baru</p>
                    </div>
                  </div>
                  <div class="col-4 text-end">
                    <div class="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                      <i class="ni ni-user text-lg opacity-10" aria-hidden="true"><?php echo $tbl_d2[0]['cn_tab']; ?></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <a href="<?php echo base_url()."Approv_con/confirm/Dep" ?>">
            <div class="card">
              <div class="card-body p-3">
                <div class="row">
                  <div class="col-8">
                    <div class="numbers">
                      <p class="text-sm mb-0 text-capitalize font-weight-bold">Deposito Baru</p>
                    </div>
                  </div>
                  <div class="col-4 text-end">
                    <div class="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                      <i class="ni ni-user text-lg opacity-10" aria-hidden="true"><?php echo $tbl_d3[0]['cn_dep']; ?></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
        <div class="col-xl-3 col-sm-6">
          <a href="<?php echo base_url()."Approv_con/confirm/Kre" ?>">
            <div class="card">
              <div class="card-body p-3">
                <div class="row">
                  <div class="col-8">
                    <div class="numbers">
                      <p class="text-sm mb-0 text-capitalize font-weight-bold">Kredit Baru</p>
                    </div>
                  </div>
                  <div class="col-4 text-end">
                    <div class="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                      <i class="ni ni-user text-lg opacity-10" aria-hidden="true"><?php echo $tbl_d4[0]['cn_kre']; ?></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
      
   

      <div class="row">
        <div class="col-md-12 mt-4">
          <div class="card">
            <div class="card-header pb-0 px-3">
              <h6 class="mb-0"><?php echo $judul; ?></h6>
            </div>
            <div class="card-body pt-4 p-3">
              <ul class="list-group">
                <?php foreach($tbl_data as $d) { ?>
                    <?php if($this->uri->segment(3) == "Nas"){ ?>
                        <li class="list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg">
                          <div class="d-flex flex-column">
                            <h6 class="mb-3 text-sm"><?php echo $d['nasabah_id'] ?><span class="mb-2 text-xs">  Tanggal Buka : <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['TGL_BUKA'] ?></span></span></h6>
                            <span class="mb-2 text-xs"> NO ID: <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['no_id'] ?>
                            </span> || NAMA NASABAH : <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['NAMA_NASABAH'] ?>
                            </span> || NO HP: <span class="text-dark ms-sm-2 font-weight-bold"><?php echo $d['NO_HP'] ?>
                            </span></span>
                          </div>
                          <div class="ms-auto text-end">
                            <a class="btn btn-link text-success px-3 mb-0" href="<?php echo base_url()?>Approv_con/det_nas/Nas/<?php echo $d['nasabah_id']?>"><i class="fas fa-pencil-alt text-success me-2" aria-hidden="true"></i>Lihat</a>
                          </div>
                        </li>
                    <?php }elseif($this->uri->segment(3) == "Tab"){ ?>
                      <li class="list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg">
                          <div class="d-flex flex-column">
                            <h6 class="mb-3 text-sm">NASABAH ID : <?php echo $d['NASABAH_ID'] ?><span class="mb-2 text-xs">Tanggal Buka : <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['TGL_REGISTRASI'] ?></span></span></h6> 
                            <span class="mb-2 text-xs"> NO REKENING: <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['NO_REKENING'] ?>
                            </span> || NAMA NASABAH : <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['NAMA_NASABAH'] ?>
                            </span> || JENIS SIMPANAN : <span class="text-dark ms-sm-2 font-weight-bold"><?php echo $d['DESKRIPSI_JENIS_TABUNGAN'] ?>
                            </span></span>
                          </div>
                          <div class="ms-auto text-end">
                            <a class="btn btn-link text-success px-3 mb-0" href="<?php echo base_url()?>Approv_con/det_nas/Tab/<?php echo $d['NO_REKENING']?>"><i class="fas fa-pencil-alt text-success me-2" aria-hidden="true"></i>Lihat</a>
                          </div>
                        </li>
                    <?php }elseif($this->uri->segment(3) == "Dep"){ ?>
                      <li class="list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg">
                          <div class="d-flex flex-column">
                            <h6 class="mb-3 text-sm">NASABAH ID : <?php echo $d['NASABAH_ID'] ?><span class="mb-2 text-xs">Tanggal Buka : <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['TGL_REGISTRASI'] ?></span></span></h6> 
                            <span class="mb-2 text-xs"> NO REKENING: <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['NO_REKENING'] ?>
                            </span> || NAMA NASABAH : <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['NAMA_NASABAH'] ?>
                            </span> || JENIS DEPOSITO : <span class="text-dark ms-sm-2 font-weight-bold"><?php echo $d['DESKRIPSI_JENIS_DEPOSITO'] ?>
                            </span></span>
                          </div>
                          <div class="ms-auto text-end">
                            <a class="btn btn-link text-success px-3 mb-0" href="<?php echo base_url()?>Approv_con/det_nas/Dep/<?php echo $d['NO_REKENING']?>"><i class="fas fa-pencil-alt text-success me-2" aria-hidden="true"></i>Lihat</a>
                          </div>
                        </li>
                    <?php }elseif($this->uri->segment(3) == "Kre"){ ?>
                      <li class="list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg">
                          <div class="d-flex flex-column">
                            <h6 class="mb-3 text-sm">NASABAH ID : <?php echo $d['NASABAH_ID'] ?><span class="mb-2 text-xs">Tanggal Buka : <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['TGL_REALISASI'] ?></span></span></h6> 
                            <span class="mb-2 text-xs"> NO REKENING: <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['NO_REKENING'] ?>
                            </span> || NAMA NASABAH : <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['NAMA_NASABAH'] ?>
                            </span> || JENIS PINJAMAN : <span class="text-dark ms-sm-2 font-weight-bold"><?php echo $d['DESKRIPSI_JENIS_KREDIT'] ?>
                            </span></span>
                          </div>
                          <div class="ms-auto text-end">
                            <a class="btn btn-link text-success px-3 mb-0" href="<?php echo base_url()?>Approv_con/det_nas/Kre/<?php echo $d['NO_REKENING']?>"><i class="fas fa-pencil-alt text-success me-2" aria-hidden="true"></i>Lihat</a>
                          </div>
                        </li>
                    <?php } ?>
                <?php } ?>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <?php include "footer.php";?>
    </div>
  </main>
  <?php include "js.php";?>
  <script>
    function myFunction() {
      // Declare variables
      var input, filter, ul, li, a, i, txtValue;
      input = document.getElementById('myInput');
      filter = input.value.toUpperCase();
      ul = document.getElementById("myUL");
      li = ul.getElementsByTagName('li');

      // Loop through all list items, and hide those who don't match the search query
      for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          li[i].style.display = "";
        } else {
          li[i].style.display = "none";
        }
      }
    }
  </script>
</body>

</html>