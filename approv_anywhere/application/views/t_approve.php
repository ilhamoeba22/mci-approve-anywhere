
<!DOCTYPE html>
<html lang="en">
<?php include "head.php";?>

<body class="g-sidenav-show  bg-gray-100">
    <?php include "navbar.php";?>
    <!-- End Navbar -->
    <div class="container-fluid py-1">
      <div class="row">
        <?php foreach($tbl_dash as $d) { ?>
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <div class="card">
            <div class="card-body p-3">
              <div class="row">
                <div class="col-8">
                  <div class="numbers">
                    <p class="text-sm mb-0 text-capitalize font-weight-bold">Today's Request</p>
                    <h5 class="font-weight-bolder mb-0">
                      <?php echo $d['cn_all']; ?>
                    </h5>
                  </div>
                </div>
                <div class="col-4 text-end">
                  <div class="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                    <i class="ni ni-money-coins text-lg opacity-10" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <div class="card">
            <div class="card-body p-3">
              <div class="row">
                <div class="col-8">
                  <div class="numbers">
                    <p class="text-sm mb-0 text-capitalize font-weight-bold">Today's Users</p>
                    <h5 class="font-weight-bolder mb-0">
                      <?php echo $d['cn_user']; ?>
                    </h5>
                  </div>
                </div>
                <div class="col-4 text-end">
                  <div class="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                    <i class="ni ni-world text-lg opacity-10" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-sm-6 mb-xl-0 mb-4">
          <div class="card">
            <div class="card-body p-3">
              <div class="row">
                <div class="col-8">
                  <div class="numbers">
                    <p class="text-sm mb-0 text-capitalize font-weight-bold">Today's Success</p>
                    <h5 class="font-weight-bolder mb-0 text-success">
                      <?php echo $d['cn_sukses']; ?>
                    </h5>
                  </div>
                </div>
                <div class="col-4 text-end">
                  <div class="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                    <i class="ni ni-paper-diploma text-lg opacity-10" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-sm-6">
          <div class="card">
            <div class="card-body p-3">
              <div class="row">
                <div class="col-8">
                  <div class="numbers">
                    <p class="text-sm mb-0 text-capitalize font-weight-bold">Today's Failed</p>
                    <h5 class="font-weight-bolder mb-0 text-danger">
                      <?php echo $d['cn_failed']; ?>
                    </h5>
                  </div>
                </div>
                <div class="col-4 text-end">
                  <div class="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                    <i class="ni ni-cart text-lg opacity-10" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <?php } ?>
      </div>
      <br>
      <div class="row">
        <div class="col-lg-12">
            <?php if($this->session->flashdata('success')): ?>
                <div>
                  <center> 
                      <button class="btn .btl-lg btn-success">
                          <?php echo $this->session->flashdata('success'); ?>
                      </button>
                  </center>
                </div>
            <?php endif; ?>
            <?php if($this->session->flashdata('warning')): ?>
                <div >
                  <center>
                  <button class="btn .btl-lg btn-warning">
                      <?php echo $this->session->flashdata('warning'); ?>
                  </button>
                  </center>
                </div>
              <?php endif; ?>
      </div>
      <div class="row">
        <div class="col-md-8 mt-4">
          <div class="card">
            <div class="card-header pb-0 px-3">
              <h6 class="mb-0">Otorisasi Information</h6>
            </div>
            <div class="card-body pt-4 p-3">
              <ul class="list-group">
                <?php foreach($tbl_data as $d) { ?>
                  <li class="list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg">
                    <div class="d-flex flex-column">
                      <h6 class="mb-3 text-sm"><?php echo $d['userid'] ?></h6>
                      
                      <span class="mb-2 text-xs"> Nama Pemohon: 
                      <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['nmuser'] ?></span> || Waktu: 
                      <span class="text-dark font-weight-bold ms-sm-2"><?php echo $d['levelx'] ?></span> || Jumlah Transaksi: 
                      <span class="text-dark ms-sm-2 font-weight-bold"><?php echo $d['akses'] ?></span></span>
                      <span class="mb-2 text-xs"></span>
                      
                    </div>
                    <div class="ms-auto text-end">
                       <!-- <a class="btn btn-link text-success px-3 mb-0" href="<?php echo base_url()?>Approv_con/det_app/<?php echo $d['id']?>"><i class="fas fa-pencil-alt text-success me-2" aria-hidden="true"></i>Lihat</a> -->
                    </div>
                  </li>
                <?php } ?>
              </ul>
            </div>
          </div>
        </div>
        <div class="col-md-4 mt-4">
          <div class="card h-100 mb-4">
            <div class="card-header pb-0 px-3">
              <div class="row">
                <div class="col-md-6">
                  <h6 class="mb-0">History Otorisasi</h6>
                </div>
                <div class="col-md-6 d-flex justify-content-end align-items-center">
                  <i class="far fa-calendar-alt me-2"></i>
                  <small></small>
                </div>
              </div>
            </div>
            <div class="card-body pt-4 p-3">
              <h6 class="text-uppercase text-body text-xs font-weight-bolder mb-3">Today</h6>
              <ul class="list-group">
                <?php foreach($tbl_hist as $d) { ?>
                  <?php if($d['status_otor']=="TERIMA"){ 
                    $notif = "text-success";
                    $cc    = "success";
                    $c     = "fa-arrow-up";
                  }elseif($d['status_otor']=="TUNGGU"){
                    $notif = "text-dark";
                    $cc    = "dark";
                    $c     = "fa-exclamation";
                  }else{
                    $notif = "text-danger";
                    $cc    = "danger";
                    $c     = "fa-exclamation";
                  }
                  ?>
                  <li class="list-group-item border-0 d-flex justify-content-between ps-0 mb-2 border-radius-lg">
                    <div class="d-flex align-items-center">
                      <button class="btn btn-icon-only btn-rounded btn-outline-<?php echo $cc ?> mb-0 me-3 btn-sm d-flex align-items-center justify-content-center"><i class="fas <?php echo $c ?>"></i></button>
                      <div class="d-flex flex-column">
                        <h6 class="mb-1 <?php echo $notif ?> text-sm"><?php echo $d['username_minta'] ?></h6>
                        <span class="text-xs"><?php echo $d['waktu_minta'] ?></span>
                      </div>
                    </div>
                    <div class="d-flex align-items-center text-dark text-gradient text-sm font-weight-bold">
                      <?php echo number_format($d['jumlah_trans'],0,",",".") ?>
                    </div>
                  </li>
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
  
</body>

</html>