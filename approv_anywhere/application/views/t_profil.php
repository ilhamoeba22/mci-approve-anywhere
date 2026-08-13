
<!DOCTYPE html>
<html lang="en">

<?php include "head.php";?>
<?php 
$session_data   = $this->session->userdata('data_session');
$user           = $session_data['user'];
$nama           = $session_data['nama'];
$device         = $session_data['device'];
$jabatan        = $session_data['jabatan'];
?>
<body class="g-sidenav-show bg-gray-100">
    <?php include "navbar.php";?>
    <!-- End Navbar -->
    <div class="container-fluid">
      <div class="page-header min-height-100 border-radius-xl mt-4" style="background-image: url('../assets/img/curved-images/curved0.jpg'); background-position-y: 50%;">
        <span class="mask bg-gradient-primary opacity-6"></span>
      </div>
      <div class="card card-body blur shadow-blur mx-4 mt-n6 overflow-hidden">
        <div class="row gx-4 text-center">
            <div class="col-12">
                <div class="avatar avatar-xl position-relativer text-center">
                    <img src="../assets/img/theme/tim.png" alt="profile_image" class="w-100 border-radius-lg shadow-sm">
                </div>
            </div>
            <div class="col-12 my-auto">
                <div class="h-100">
                    <h5 class="mb-1">
                        <?php echo $nama ?>
                    </h5>
                    <p class="mb-0 font-weight-bold text-sm">
                        <?php echo $jabatan ?>
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12 col-xl-5">
            <div class="card bg-transparent shadow-xl">
                <div class="overflow-hidden position-relative border-radius-xl" style="background-image: url('../assets/img/curved-images/curved14.jpg');">
                    <span class="mask bg-gradient-dark">__BPRS HIK MCI</span>
                    <div class="card-body position-relative z-index-1 p-3">
                        <i class="fas fa-wifi text-white p-2"></i>
                        <h5 class="text-white mt-4 mb-5 pb-2"><?php echo $nama ?></h5>
                        <div class="d-flex">
                            <div class="d-flex">
                                <div class="me-4">
                                    <p class="text-white text-sm opacity-8 mb-0">Username</p>
                                    <h6 class="text-white mb-0"><?php echo $user ?></h6>
                                </div>
                                <div>
                                    <p class="text-white text-sm opacity-8 mb-0">Nama Komputer</p>
                                    <h6 class="text-white mb-0"><?php echo $device ?></h6>
                                </div>
                            </div>
                            <div class="ms-auto w-20 d-flex align-items-end justify-content-end">
                                <img class="w-100 mt-0" src="../assets/img/logo_baru.png" alt="logo">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-12 col-xl-6 py-2">
          <div class="card h-100">
            <div class="card-header pb-0 p-3">
              <div class="row">
                <div class="col-md-8 d-flex align-items-center">
                  <h6 class="mb-0">Profile Information</h6>
                </div>
                <div class="col-md-4 text-end">
                  <a href="javascript:;">
                    <i class="fas fa-user-edit text-secondary text-sm" data-bs-toggle="tooltip" data-bs-placement="top" title="Edit Profile"></i>
                  </a>
                </div>
              </div>
            </div>
            <div class="card-body p-1">
              <hr class="horizontal gray-light my-1">   
              <ul class="list-group">
                <?php foreach($tbl_data as $d){ ?>
                <li class="list-group-item border-0 ps-0 pt-0 text-sm"><strong class="text-dark">Full Name:</strong> &nbsp; <?php echo $d['namalengkap']; ?></li>
                <li class="list-group-item border-0 ps-0 pt-0 text-sm"><strong class="text-dark">Limit Setor:</strong> &nbsp; <?php echo $d['LIMIT_SETOR']; ?></li>
                <li class="list-group-item border-0 ps-0 pt-0 text-sm"><strong class="text-dark">Limit Tarik:</strong> &nbsp; <?php echo $d['LIMIT_TARIK']; ?></li>
                <li class="list-group-item border-0 ps-0 pt-0 text-sm"><strong class="text-dark">Limit Kas Umum:</strong> &nbsp; <?php echo $d['LIMIT_KASUMUM']; ?></li>
                <li class="list-group-item border-0 ps-0 pt-0 text-sm"><strong class="text-dark">Limit Approval:</strong> &nbsp; <?php echo $d['limit_approval']; ?></li>
                <?php }?>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <?php include "footer.php";?>
    </div>
  </div>
  <?php include "js.php";?>
</body>

</html>