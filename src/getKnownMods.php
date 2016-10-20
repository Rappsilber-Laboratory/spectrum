<?php
$json = file_get_contents('http://129.215.14.63/xiAnnotator/annotate/knownModifications');
echo json_encode($json);
?>